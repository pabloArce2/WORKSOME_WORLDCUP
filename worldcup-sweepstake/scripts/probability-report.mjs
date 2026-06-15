import { enrichTeam, normalizeTeamName } from '../src/assets/data/teamMeta.js'
import { calculateTournamentProbabilities } from '../src/services/probabilityModel.js'

const API_BASE_URL = readEnv('VITE_THESPORTSDB_API_BASE_URL', 'https://www.thesportsdb.com/api/v1/json')
  .replace(/\/$/, '')
const API_KEY = readEnv('VITE_THESPORTSDB_API_KEY', '123')
const LEAGUE_ID = readEnv('VITE_THESPORTSDB_WORLDCUP_LEAGUE_ID', '4429')
const SEASON = readEnv('VITE_THESPORTSDB_WORLDCUP_SEASON', '2026')
const ROUND_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8]
const GROUP_ORDER = 'ABCDEFGHIJKL'.split('')

const limit = Number(process.argv[2] || 12)
const matches = await fetchMatches()
const groups = buildGroups(matches)
const probabilities = Object.values(calculateTournamentProbabilities({ groups, matches }))
  .sort((a, b) => b.championProbability - a.championProbability)
  .slice(0, limit)

console.log(`World Cup probability report (${new Date().toLocaleString()})`)
console.log(`Source: TheSportsDB league ${LEAGUE_ID}, season ${SEASON}`)
console.log('')
console.log([
  pad('Team', 22),
  pad('Now', 8),
  pad('Pre', 8),
  pad('Advance', 9),
  pad('Final', 8),
  pad('Rating', 8),
  'Delta',
].join(''))

probabilities.forEach(team => {
  console.log([
    pad(team.teamName, 22),
    pad(formatPct(team.championProbability), 8),
    pad(formatPct(team.preTournamentProbability), 8),
    pad(formatPct(team.groupAdvanceProbability), 9),
    pad(formatPct(team.finalProbability), 8),
    pad(String(team.liveRating), 8),
    signed(team.formRatingDelta),
  ].join(''))
})

async function fetchMatches() {
  const roundResults = await Promise.all(
    ROUND_NUMBERS.map(async round => {
      const url = new URL(`${API_BASE_URL}/${API_KEY}/eventsround.php`)
      url.searchParams.set('id', LEAGUE_ID)
      url.searchParams.set('r', round)
      url.searchParams.set('s', SEASON)

      const response = await fetch(url)
      if (!response.ok) throw new Error(`TheSportsDB returned ${response.status}`)

      const body = await response.json()
      return Array.isArray(body.events) ? body.events : []
    })
  )

  return roundResults.flat().map(normalizeEvent).filter(Boolean)
}

function normalizeEvent(event) {
  const group = normalizeGroupId(event.strGroup)
  const roundNumber = Number(event.intRound) || 0
  const home = normalizeTeam(event.strHomeTeam, event.idHomeTeam, event.strHomeTeamBadge, group)
  const away = normalizeTeam(event.strAwayTeam, event.idAwayTeam, event.strAwayTeamBadge, group)

  if (!home || !away) return null

  const homeScore = optionalNumber(event.intHomeScore)
  const awayScore = optionalNumber(event.intAwayScore)

  return {
    id: String(event.idEvent),
    apiId: event.idEvent,
    roundNumber,
    group,
    status: event.strStatus || '',
    kickoff: event.strTimestamp || '',
    home,
    away,
    homeScore,
    awayScore,
  }
}

function normalizeTeam(name, apiId, logo, group) {
  if (!name) return null

  return enrichTeam({
    id: slugify(name),
    apiId,
    name,
    logo,
    group,
  })
}

function buildGroups(matches) {
  const byGroup = new Map()

  matches.forEach(match => {
    if (!match.group) return

    const group = byGroup.get(match.group) || { id: match.group, name: `Group ${match.group}`, teamsById: new Map() }
    byGroup.set(match.group, group)

    ensureTeam(group.teamsById, match.home)
    ensureTeam(group.teamsById, match.away)

    if (!isPlayed(match)) return

    applyResult(group.teamsById.get(match.home.id), match.homeScore, match.awayScore)
    applyResult(group.teamsById.get(match.away.id), match.awayScore, match.homeScore)
  })

  return GROUP_ORDER
    .map(groupId => byGroup.get(groupId))
    .filter(Boolean)
    .map(group => ({
      id: group.id,
      name: group.name,
      teams: Array.from(group.teamsById.values())
        .map(team => ({ ...team, gd: team.gf - team.ga }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)),
    }))
}

function ensureTeam(teamsById, team) {
  if (!team?.id || teamsById.has(team.id)) return

  teamsById.set(team.id, {
    ...team,
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

function isPlayed(match) {
  if (match.homeScore === null || match.awayScore === null) return false
  return String(match.status || '').toLowerCase() !== 'ns'
}

function normalizeGroupId(value = '') {
  const group = String(value).replace(/^group\s+/i, '').trim().toUpperCase()
  return GROUP_ORDER.includes(group) ? group : ''
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function slugify(value) {
  return normalizeTeamName(value).replace(/\s+/g, '_')
}

function formatPct(value) {
  const number = Number(value || 0)
  if (number > 0 && number < 0.001) return '<0.1%'
  return `${(number * 100).toFixed(1)}%`
}

function signed(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : ''}${number}`
}

function pad(value, width) {
  return String(value || '').padEnd(width, ' ')
}

function readEnv(key, fallback) {
  return globalThis.process?.env?.[key] || fallback
}
