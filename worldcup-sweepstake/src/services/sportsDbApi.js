import fallbackGroupsData from '../assets/data/groups.json'
import fallbackTeams from '../assets/data/teams.json'
import { enrichTeam, getTeamMeta, normalizeTeamName } from '../assets/data/teamMeta.js'
import {
  attachProbabilitiesToGroups,
  attachProbabilitiesToMatches,
  calculateTournamentProbabilities,
} from './probabilityModel.js'

const API_BASE_URL = readEnv('VITE_THESPORTSDB_API_BASE_URL', 'https://www.thesportsdb.com/api/v1/json')
  .replace(/\/$/, '')

const API_KEY = readEnv('VITE_THESPORTSDB_API_KEY', '123')
const LEAGUE_ID = readEnv('VITE_THESPORTSDB_WORLDCUP_LEAGUE_ID', '4429')
const SEASON = readEnv('VITE_THESPORTSDB_WORLDCUP_SEASON', '2026')
const ROUND_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8]
const GROUP_ORDER = 'ABCDEFGHIJKL'.split('')
const TIMELINE_EVENT_LIMIT = 10

const fallbackTeamsByName = new Map(fallbackTeams.map(team => [normalizeTeamName(team.name), enrichTeam(team)]))

export class SportsDbApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'SportsDbApiError'
    this.status = options.status ?? null
    this.cause = options.cause
  }
}

export function getFallbackTeams() {
  return fallbackTeams.map(team => enrichTeam({ ...team }))
}

export function getFallbackGroups() {
  return clone(fallbackGroupsData.groups).map(group => ({
    ...group,
    teams: group.teams.map(team => enrichTeam(team)),
  }))
}

export function getFallbackBracket() {
  return {
    r32: emptyRound('r32', 16),
    ...clone(fallbackGroupsData.bracket),
  }
}

export async function getTournamentTeams() {
  const snapshot = await getTournamentSnapshot({ includeStats: false })
  const teamsById = new Map()

  snapshot.groups.forEach(group => {
    group.teams.forEach(team => teamsById.set(team.id, { ...team, group: team.group || group.id }))
  })

  snapshot.matches.forEach(match => {
    if (match.home?.id) teamsById.set(match.home.id, match.home)
    if (match.away?.id) teamsById.set(match.away.id, match.away)
  })

  return teamsById.size ? Array.from(teamsById.values()) : getFallbackTeams()
}

export async function getTournamentSnapshot(options = {}) {
  const includeStats = options.includeStats ?? true
  const errors = []
  const roundResults = await Promise.allSettled(ROUND_NUMBERS.map(fetchRoundEvents))

  const roundEvents = roundResults.flatMap(result => {
    if (result.status === 'fulfilled') return result.value
    errors.push(result.reason)
    return []
  })

  const matches = mergeMatches(roundEvents.map(normalizeEvent).filter(Boolean))
  const groups = buildGroups(matches)
  const resolvedGroups = groups.length ? groups : getFallbackGroups()
  const probabilities = calculateTournamentProbabilities({ groups: resolvedGroups, matches })
  const groupsWithProbabilities = attachProbabilitiesToGroups(resolvedGroups, probabilities)
  const matchesWithProbabilities = attachProbabilitiesToMatches(matches, probabilities)
  const timelineStats = includeStats ? await fetchTimelineStats(matches) : { goalscorers: [], cards: [] }
  const hasApiData = matches.length > 0 || groups.length > 0

  if (!hasApiData && errors.length) {
    throw errors[0]
  }

  return {
    groups: groupsWithProbabilities,
    bracket: buildBracket(matchesWithProbabilities),
    matches: matchesWithProbabilities,
    probabilities,
    goalscorers: timelineStats.goalscorers,
    cards: timelineStats.cards,
    updatedAt: new Date().toISOString(),
    source: hasApiData ? (errors.length ? 'partial' : 'api') : 'fallback',
    error: errors[0]?.message ?? '',
  }
}

async function request(endpoint, params = {}) {
  const url = new URL(`${API_BASE_URL}/${API_KEY}/${endpoint}`)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  let response
  try {
    response = await fetch(url.toString())
  } catch (error) {
    throw new SportsDbApiError('TheSportsDB request failed', { cause: error })
  }

  const text = await response.text()
  const body = parseJson(text)

  if (!response.ok) {
    throw new SportsDbApiError(`TheSportsDB returned ${response.status}`, { status: response.status })
  }

  if (!body || body.error) {
    throw new SportsDbApiError(body?.error || 'TheSportsDB returned an empty response')
  }

  return body
}

async function fetchRoundEvents(roundNumber) {
  const body = await request('eventsround.php', {
    id: LEAGUE_ID,
    r: roundNumber,
    s: SEASON,
  })

  return Array.isArray(body.events) ? body.events : []
}

async function fetchTimelineStats(matches) {
  const candidates = matches
    .filter(match => match.homeScore !== null && match.awayScore !== null && normalizeName(match.status) !== 'ns')
    .sort((a, b) => toTimestamp(b.kickoff) - toTimestamp(a.kickoff))
    .slice(0, TIMELINE_EVENT_LIMIT)

  const timelineResults = await Promise.allSettled(candidates.map(match => fetchEventTimeline(match)))
  const timelines = []

  timelineResults.forEach(result => {
    if (result.status === 'fulfilled') {
      timelines.push(...result.value)
    }
  })

  return buildTimelineStats(timelines, matches)
}

async function fetchEventTimeline(match) {
  const body = await request('lookuptimeline.php', { id: match.apiId })
  const rows = Array.isArray(body.timeline) ? body.timeline : []
  return rows.map(row => ({ ...row, matchId: match.id }))
}

function normalizeEvent(event) {
  const groupId = normalizeGroupId(event.strGroup)
  const roundNumber = toNumber(event.intRound)
  const home = normalizeTeam({
    apiId: event.idHomeTeam,
    name: event.strHomeTeam,
    badge: event.strHomeTeamBadge,
    group: groupId,
  })
  const away = normalizeTeam({
    apiId: event.idAwayTeam,
    name: event.strAwayTeam,
    badge: event.strAwayTeamBadge,
    group: groupId,
  })

  if (!home && !away) return null

  const homeScore = toOptionalNumber(event.intHomeScore)
  const awayScore = toOptionalNumber(event.intAwayScore)

  return {
    id: String(event.idEvent),
    apiId: event.idEvent,
    round: formatRound(roundNumber),
    roundNumber,
    group: groupId,
    status: event.strStatus || '',
    venue: event.strVenue || event.strCity || event.strCountry || '',
    kickoff: event.strTimestamp || normalizeKickoff(event.dateEvent, event.strTime),
    home,
    away,
    homeScore,
    awayScore,
    scoreLabel: homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : '',
  }
}

function buildTimelineStats(timelineRows, matches) {
  const matchesById = new Map(matches.map(match => [match.id, match]))
  const goalsByPlayer = new Map()
  const cardsByPlayer = new Map()

  timelineRows.forEach(row => {
    const timeline = normalizeName(row.strTimeline)
    const detail = normalizeName(row.strTimelineDetail)
    const team = resolveTimelineTeam(row, matchesById.get(String(row.matchId)))
    const player = row.strPlayer || 'Unknown player'
    const key = `${player}-${team?.id || row.idTeam || ''}`

    if (timeline === 'goal' && !detail.includes('own goal')) {
      const item = goalsByPlayer.get(key) || { player, team, goals: 0 }
      item.goals += 1
      goalsByPlayer.set(key, item)
    }

    if (timeline === 'card') {
      const item = cardsByPlayer.get(key) || {
        player,
        team,
        yellowCards: 0,
        redCards: 0,
        totalCards: 0,
      }

      if (detail.includes('red')) item.redCards += 1
      else item.yellowCards += 1

      item.totalCards = item.yellowCards + item.redCards
      cardsByPlayer.set(key, item)
    }
  })

  return {
    goalscorers: Array.from(goalsByPlayer.values()).sort((a, b) => b.goals - a.goals),
    cards: Array.from(cardsByPlayer.values()).sort((a, b) => b.totalCards - a.totalCards || b.redCards - a.redCards),
  }
}

function resolveTimelineTeam(row, match) {
  if (match?.home?.apiId && String(match.home.apiId) === String(row.idTeam)) return match.home
  if (match?.away?.apiId && String(match.away.apiId) === String(row.idTeam)) return match.away

  return normalizeTeam({
    apiId: row.idTeam,
    name: row.strTeam,
  })
}

function buildGroups(matches) {
  const byGroup = new Map()

  matches.forEach(match => {
    if (!match.group) return

    const group = ensureGroup(byGroup, match.group)
    ensureStandingTeam(group.teamsById, match.home, match.group)
    ensureStandingTeam(group.teamsById, match.away, match.group)

    if (!shouldCountMatch(match)) return

    applyResult(group.teamsById.get(match.home.id), match.homeScore, match.awayScore)
    applyResult(group.teamsById.get(match.away.id), match.awayScore, match.homeScore)
  })

  return GROUP_ORDER
    .map(groupId => byGroup.get(groupId))
    .filter(Boolean)
    .map(group => {
      const teams = Array.from(group.teamsById.values())
        .map(team => ({
          ...team,
          gd: team.gf - team.ga,
        }))
        .sort((a, b) =>
          b.pts - a.pts ||
          b.gd - a.gd ||
          b.gf - a.gf ||
          a.name.localeCompare(b.name)
        )
        .map((team, index) => ({ ...team, rank: index + 1 }))

      return {
        id: group.id,
        name: `Group ${group.id}`,
        teams,
      }
    })
}

function ensureGroup(groupsById, groupId) {
  if (!groupsById.has(groupId)) {
    groupsById.set(groupId, { id: groupId, teamsById: new Map() })
  }

  return groupsById.get(groupId)
}

function ensureStandingTeam(teamsById, team, groupId) {
  if (!team?.id || teamsById.has(team.id)) return

  teamsById.set(team.id, {
    ...team,
    group: groupId,
    rank: 0,
    played: 0,
    w: 0,
    d: 0,
    l: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
  })
}

function applyResult(team, goalsFor, goalsAgainst) {
  if (!team) return

  team.played += 1
  team.gf += goalsFor
  team.ga += goalsAgainst

  if (goalsFor > goalsAgainst) {
    team.w += 1
    team.pts += 3
  } else if (goalsFor === goalsAgainst) {
    team.d += 1
    team.pts += 1
  } else {
    team.l += 1
  }
}

function shouldCountMatch(match) {
  if (match.homeScore === null || match.awayScore === null) return false
  const status = normalizeName(match.status)
  return status !== 'ns' && status !== 'not started' && status !== 'postponed'
}

function buildBracket(matches) {
  const rounds = {
    r32: [],
    r16: [],
    qf: [],
    sf: [],
    final: [],
  }

  matches.forEach(match => {
    const key = bracketRoundKey(match.roundNumber)
    if (key) rounds[key].push(match)
  })

  return {
    r32: fillRound('r32', 16, rounds.r32),
    r16: fillRound('r16', 8, rounds.r16),
    qf: fillRound('qf', 4, rounds.qf),
    sf: fillRound('sf', 2, rounds.sf),
    final: fillRound('final', 1, rounds.final),
  }
}

function fillRound(round, count, matches) {
  const sorted = [...matches].sort(sortByKickoff)
  return Array.from({ length: count }, (_, index) => sorted[index] || {
    id: `${round}_${index + 1}`,
    home: null,
    away: null,
    status: 'TBD',
  })
}

function emptyRound(round, count) {
  return fillRound(round, count, [])
}

function bracketRoundKey(roundNumber) {
  if (roundNumber === 4) return 'r32'
  if (roundNumber === 5) return 'r16'
  if (roundNumber === 6) return 'qf'
  if (roundNumber === 7) return 'sf'
  if (roundNumber === 8) return 'final'
  return ''
}

function mergeMatches(matches) {
  const byId = new Map()

  matches.filter(Boolean).forEach(match => {
    byId.set(match.id, { ...byId.get(match.id), ...match })
  })

  return Array.from(byId.values()).sort(sortRelevantMatches)
}

function normalizeTeam(team) {
  if (!team?.name) return null

  const fallback = fallbackTeamsByName.get(normalizeTeamName(team.name))
  const meta = getTeamMeta(team.name)
  const name = team.name || fallback?.name || 'TBD'

  return {
    ...fallback,
    id: fallback?.id || slugify(name),
    apiId: team.apiId || null,
    name,
    flag: meta?.flag || fallback?.flag || '',
    logo: meta?.logo || team.badge || team.logo || fallback?.logo || '',
    group: team.group || fallback?.group || null,
    color: fallback?.color || '#7C3AED',
    preOdds: fallback?.preOdds ?? 0,
  }
}

function normalizeGroupId(value = '') {
  const group = String(value).replace(/^group\s+/i, '').trim().toUpperCase()
  return GROUP_ORDER.includes(group) ? group : ''
}

function formatRound(roundNumber) {
  if (roundNumber >= 1 && roundNumber <= 3) return `Group Round ${roundNumber}`
  if (roundNumber === 4) return 'Round of 32'
  if (roundNumber === 5) return 'Round of 16'
  if (roundNumber === 6) return 'Quarter-finals'
  if (roundNumber === 7) return 'Semi-finals'
  if (roundNumber === 8) return 'Final'
  return ''
}

function normalizeKickoff(dateValue, timeValue) {
  if (!dateValue && !timeValue) return ''
  if (dateValue && timeValue) return `${dateValue}T${timeValue}`
  return String(dateValue || timeValue)
}

function sortRelevantMatches(a, b) {
  const now = Date.now()
  const aTime = toTimestamp(a.kickoff)
  const bTime = toTimestamp(b.kickoff)
  const aDistance = Number.isFinite(aTime) ? Math.abs(aTime - now) : Number.MAX_SAFE_INTEGER
  const bDistance = Number.isFinite(bTime) ? Math.abs(bTime - now) : Number.MAX_SAFE_INTEGER
  return aDistance - bDistance
}

function sortByKickoff(a, b) {
  return toTimestamp(a.kickoff) - toTimestamp(b.kickoff)
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

function normalizeName(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
}

function slugify(value = '') {
  return normalizeName(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toTimestamp(value) {
  if (!value) return Number.NaN
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readEnv(key, fallback) {
  return import.meta.env?.[key] || globalThis.process?.env?.[key] || fallback
}
