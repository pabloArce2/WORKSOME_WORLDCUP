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
const WORLDCUP26_API_BASE_URL = readEnv('VITE_WORLDCUP26_API_BASE_URL', 'https://worldcup26.ir')
  .replace(/\/$/, '')
const WORLDCUP26_RAW_BASE_URL = readEnv(
  'VITE_WORLDCUP26_RAW_BASE_URL',
  'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main'
).replace(/\/$/, '')
const ENABLE_THESPORTSDB_FALLBACK = readEnv('VITE_ENABLE_THESPORTSDB_FALLBACK', 'false') === 'true'
const LIVE_CACHE_TTL = 120_000
const RAW_CACHE_TTL = 3_600_000

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
  const errors = []

  try {
    return await getWorldCup26Snapshot({ ...options, useRawFiles: false })
  } catch (error) {
    errors.push(error)
  }

  try {
    const snapshot = await getWorldCup26Snapshot({ ...options, useRawFiles: true })
    return {
      ...snapshot,
      source: 'github',
      error: errors[0]?.message ?? '',
    }
  } catch (error) {
    errors.push(error)
  }

  if (ENABLE_THESPORTSDB_FALLBACK) {
    try {
      const snapshot = await getSportsDbSnapshot(options)
      return {
        ...snapshot,
        error: snapshot.error || errors[0]?.message || '',
      }
    } catch (error) {
      errors.push(error)
    }
  }

  const groups = getFallbackGroups()
  const matches = []
  const probabilities = calculateTournamentProbabilities({ groups, matches })

  return {
    groups: attachProbabilitiesToGroups(groups, probabilities),
    bracket: getFallbackBracket(),
    matches,
    probabilities,
    goalscorers: [],
    cards: [],
    updatedAt: new Date().toISOString(),
    source: 'fallback',
    error: errors[0]?.message ?? '',
  }
}

async function getSportsDbSnapshot(options = {}) {
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

async function getWorldCup26Snapshot(options = {}) {
  const useRawFiles = options.useRawFiles ?? false
  const includeStats = options.includeStats ?? true
  const [teamsPayload, matchesPayload, groupsPayload, stadiumsPayload] = await Promise.all([
    fetchWorldCup26Resource('teams', useRawFiles),
    fetchWorldCup26Resource('games', useRawFiles),
    fetchWorldCup26Resource('groups', useRawFiles),
    fetchWorldCup26Resource('stadiums', useRawFiles),
  ])

  const teams = unwrapWorldCup26List(teamsPayload, 'teams')
  const rawMatches = unwrapWorldCup26List(matchesPayload, 'games')
  const rawGroups = unwrapWorldCup26List(groupsPayload, 'groups')
  const stadiums = unwrapWorldCup26List(stadiumsPayload, 'stadiums')

  if (!teams.length) throw new SportsDbApiError('WorldCup26 returned no teams')

  const teamsByApiId = new Map(teams.map(team => [String(team.id), normalizeWorldCup26Team(team)]))
  const stadiumsById = new Map(stadiums.map(stadium => [String(stadium.id), stadium]))
  const matches = mergeMatches(rawMatches.map(match => normalizeWorldCup26Match(match, teamsByApiId, stadiumsById)).filter(Boolean))
  const groups = buildWorldCup26Groups(rawGroups, teamsByApiId, matches)
  const resolvedGroups = groups.length ? groups : buildGroups(matches)
  const probabilities = calculateTournamentProbabilities({ groups: resolvedGroups, matches })
  const groupsWithProbabilities = attachProbabilitiesToGroups(resolvedGroups, probabilities)
  const matchesWithProbabilities = attachProbabilitiesToMatches(matches, probabilities)
  const hasLiveData = groupsWithProbabilities.some(group => group.teams.some(team => Number(team.played) > 0))

  return {
    groups: groupsWithProbabilities,
    bracket: buildBracket(matchesWithProbabilities),
    matches: matchesWithProbabilities,
    probabilities,
    goalscorers: includeStats ? buildWorldCup26Goalscorers(matchesWithProbabilities) : [],
    cards: [],
    updatedAt: new Date().toISOString(),
    source: useRawFiles ? 'github' : hasLiveData ? 'worldcup26' : 'worldcup26_schedule',
    error: '',
  }
}

async function fetchWorldCup26Resource(resource, useRawFiles) {
  const fileByResource = {
    teams: 'football.teams.json',
    games: 'football.matches.json',
    groups: 'football.matchtables.json',
    stadiums: 'football.stadiums.json',
  }
  const url = useRawFiles
    ? `${WORLDCUP26_RAW_BASE_URL}/${fileByResource[resource]}`
    : `${WORLDCUP26_API_BASE_URL}/get/${resource}`

  return cachedRequestJson(url, {
    cacheKey: `worldcup26:${useRawFiles ? 'raw' : 'live'}:${resource}`,
    ttl: useRawFiles ? RAW_CACHE_TTL : LIVE_CACHE_TTL,
  })
}

function unwrapWorldCup26List(payload, key) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.[key])) return payload[key]
  return []
}

function normalizeWorldCup26Team(row) {
  const name = canonicalTeamName(row.name_en || row.name || row.team_name_en || '')
  const meta = getTeamMeta(name)
  const fallback = fallbackTeamsByName.get(normalizeTeamName(name))

  return {
    ...fallback,
    id: fallback?.id || slugify(meta?.name || name),
    apiId: row.id,
    name: meta?.name || name,
    flag: meta?.flag || fallback?.flag || '',
    logo: meta?.logo || fallback?.logo || '',
    group: row.groups || row.group || fallback?.group || '',
    color: fallback?.color || '#7C3AED',
    preOdds: fallback?.preOdds ?? 0,
    fifaCode: row.fifa_code || '',
    apiFlag: row.flag || '',
  }
}

function normalizeWorldCup26Match(row, teamsByApiId, stadiumsById) {
  const type = String(row.type || '').toLowerCase()
  const roundNumber = worldCup26RoundNumber(type, row.matchday)
  const groupId = normalizeGroupId(row.group)
  const home = resolveWorldCup26MatchTeam(row.home_team_id, row.home_team_name_en, row.home_team_label, teamsByApiId)
  const away = resolveWorldCup26MatchTeam(row.away_team_id, row.away_team_name_en, row.away_team_label, teamsByApiId)
  const homeScore = isWorldCup26Played(row) ? toOptionalNumber(row.home_score) : null
  const awayScore = isWorldCup26Played(row) ? toOptionalNumber(row.away_score) : null
  const stadium = stadiumsById.get(String(row.stadium_id))

  return {
    id: `wc26_${row.id}`,
    apiId: row.id,
    round: formatRound(roundNumber) || formatWorldCup26Type(type),
    roundNumber,
    group: type === 'group' ? groupId : '',
    status: formatWorldCup26Status(row),
    venue: formatWorldCup26Venue(stadium),
    kickoff: parseWorldCup26Date(row.local_date),
    home,
    away,
    homeScore,
    awayScore,
    scoreLabel: homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : '',
    homeScorers: parseScorers(row.home_scorers),
    awayScorers: parseScorers(row.away_scorers),
  }
}

function resolveWorldCup26MatchTeam(teamId, teamName, teamLabel, teamsByApiId) {
  const apiTeam = teamsByApiId.get(String(teamId))
  if (apiTeam) return apiTeam

  if (teamName) {
    return normalizeWorldCup26Team({
      id: teamId || slugify(teamName),
      name_en: teamName,
    })
  }

  if (teamLabel) {
    return {
      id: '',
      apiId: teamId || null,
      name: teamLabel,
      flag: '',
      logo: '',
      color: '#7C3AED',
    }
  }

  return null
}

function buildWorldCup26Groups(rawGroups, teamsByApiId, matches) {
  if (!rawGroups.length) return []

  return rawGroups
    .map(group => {
      const teams = (group.teams || [])
        .map(row => {
          const team = teamsByApiId.get(String(row.team_id))
          if (!team) return null

          return {
            ...team,
            group: group.name || group.group || team.group,
            played: toNumber(row.mp),
            w: toNumber(row.w),
            d: toNumber(row.d),
            l: toNumber(row.l),
            gf: toNumber(row.gf),
            ga: toNumber(row.ga),
            gd: toNumber(row.gd),
            pts: toNumber(row.pts),
          }
        })
        .filter(Boolean)
        .sort((a, b) =>
          b.pts - a.pts ||
          b.gd - a.gd ||
          b.gf - a.gf ||
          a.name.localeCompare(b.name)
        )
        .map((team, index) => ({ ...team, rank: index + 1 }))

      return {
        id: group.name || group.group,
        name: `Group ${group.name || group.group}`,
        teams,
      }
    })
    .filter(group => GROUP_ORDER.includes(group.id) && group.teams.length)
    .sort((a, b) => GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id))
    .map(group => {
      const hasPlayedData = group.teams.some(team => Number(team.played) > 0)
      return hasPlayedData ? group : buildGroupFromMatches(group, matches)
    })
}

function buildGroupFromMatches(group, matches) {
  const rebuilt = buildGroups(matches.filter(match => match.group === group.id))[0]
  if (!rebuilt?.teams?.length) return group

  const existingById = new Map(group.teams.map(team => [team.id, team]))
  return {
    ...group,
    teams: rebuilt.teams.map(team => ({
      ...existingById.get(team.id),
      ...team,
    })),
  }
}

function buildWorldCup26Goalscorers(matches) {
  const scorers = new Map()

  matches.forEach(match => {
    addScorers(scorers, match.homeScorers, match.home)
    addScorers(scorers, match.awayScorers, match.away)
  })

  return Array.from(scorers.values()).sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player))
}

function addScorers(scorers, rows, team) {
  rows.forEach(row => {
    const player = normalizeScorerName(row)
    if (!player) return

    const key = `${player}-${team?.id || ''}`
    const item = scorers.get(key) || { player, team, goals: 0 }
    item.goals += 1
    scorers.set(key, item)
  })
}

async function cachedRequestJson(url, { cacheKey, ttl }) {
  const cached = readCachedJson(cacheKey)
  const now = Date.now()

  if (cached && now - cached.savedAt < ttl) {
    return cached.value
  }

  try {
    const response = await fetch(url)
    const text = await response.text()
    const body = parseJson(text)

    if (!response.ok) {
      throw new SportsDbApiError(`WorldCup26 returned ${response.status}`, { status: response.status })
    }

    if (!body) {
      throw new SportsDbApiError('WorldCup26 returned an empty response')
    }

    writeCachedJson(cacheKey, body)
    return body
  } catch (error) {
    if (cached?.value) return cached.value
    if (error instanceof SportsDbApiError) throw error
    throw new SportsDbApiError('WorldCup26 request failed', { cause: error })
  }
}

function readCachedJson(cacheKey) {
  try {
    const storage = globalThis.localStorage
    if (!storage) return null
    const item = storage.getItem(cacheKey)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

function writeCachedJson(cacheKey, value) {
  try {
    const storage = globalThis.localStorage
    if (!storage) return
    storage.setItem(cacheKey, JSON.stringify({
      savedAt: Date.now(),
      value,
    }))
  } catch {
    // Cache is a nice-to-have; ignore storage quota/private-mode failures.
  }
}

function canonicalTeamName(name = '') {
  const key = normalizeTeamName(name)
  const replacements = {
    'bosnia and herzegovina': 'Bosnia-Herzegovina',
    'democratic republic of the congo': 'DR Congo',
    'democratic republic of congo': 'DR Congo',
    'united states': 'USA',
    'united states of america': 'USA',
    'korea republic': 'South Korea',
    'czechia': 'Czech Republic',
    'curacao': 'Curacao',
  }

  return replacements[key] || name
}

function isWorldCup26Played(row) {
  const finished = normalizeName(row.finished)
  const elapsed = normalizeName(row.time_elapsed)
  return finished === 'true' || elapsed === 'finished' || elapsed === 'full time'
}

function formatWorldCup26Status(row) {
  const elapsed = normalizeName(row.time_elapsed)
  if (isWorldCup26Played(row)) return 'FT'
  if (elapsed === 'notstarted' || elapsed === 'not started') return 'NS'
  if (elapsed.includes('half')) return 'HT'
  if (elapsed.includes('postponed')) return 'POST'
  return row.time_elapsed || 'NS'
}

function worldCup26RoundNumber(type, matchday) {
  if (type === 'group') return Math.max(1, Math.min(3, toNumber(matchday)))
  if (type === 'r32') return 4
  if (type === 'r16') return 5
  if (type === 'qf') return 6
  if (type === 'sf') return 7
  if (type === 'final') return 8
  if (type === 'third') return 0
  return toNumber(matchday)
}

function formatWorldCup26Type(type) {
  if (type === 'r32') return 'Round of 32'
  if (type === 'r16') return 'Round of 16'
  if (type === 'qf') return 'Quarter-finals'
  if (type === 'sf') return 'Semi-finals'
  if (type === 'third') return 'Third-place match'
  if (type === 'final') return 'Final'
  return ''
}

function formatWorldCup26Venue(stadium) {
  if (!stadium) return ''
  return [stadium.fifa_name || stadium.name_en, stadium.city_en, stadium.country_en]
    .filter(Boolean)
    .join(', ')
}

function parseWorldCup26Date(value = '') {
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) return String(value || '')

  const [, month, day, year, hour, minute] = match
  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

function parseScorers(value) {
  const text = String(value || '').trim()
  if (!text || text === 'null') return []

  return text
    .replace(/^\{|\}$/g, '')
    .split('","')
    .flatMap(part => part.split(/",\s*"|,\s*(?=[A-ZÀ-ÖØ-Þ])/))
    .map(part => part.replace(/^"+|"+$/g, '').trim())
    .filter(Boolean)
}

function normalizeScorerName(value) {
  return String(value || '')
    .replace(/\d+'\+?\d*/g, '')
    .replace(/\((p|pen|og)\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
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
