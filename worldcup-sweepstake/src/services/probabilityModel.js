import { normalizeTeamName } from '../assets/data/teamMeta.js'

const SIMULATION_COUNT = 900
const GROUP_ORDER = 'ABCDEFGHIJKL'.split('')

const BASE_RATINGS = {
  algeria: 1700,
  argentina: 2110,
  australia: 1765,
  austria: 1830,
  belgium: 1945,
  'bosnia herzegovina': 1625,
  brazil: 2025,
  cameroon: 1690,
  canada: 1725,
  'cape verde': 1545,
  colombia: 1915,
  'costa rica': 1655,
  croatia: 1935,
  curacao: 1510,
  'czech republic': 1820,
  denmark: 1835,
  'dr congo': 1680,
  ecuador: 1755,
  egypt: 1705,
  england: 2045,
  france: 2075,
  germany: 1985,
  ghana: 1680,
  haiti: 1550,
  iran: 1690,
  iraq: 1615,
  'ivory coast': 1735,
  japan: 1845,
  jordan: 1580,
  mexico: 1865,
  morocco: 1905,
  netherlands: 1995,
  'new zealand': 1575,
  norway: 1795,
  panama: 1640,
  paraguay: 1740,
  poland: 1745,
  portugal: 2015,
  qatar: 1635,
  'saudi arabia': 1630,
  scotland: 1695,
  senegal: 1800,
  serbia: 1805,
  'south africa': 1665,
  'south korea': 1785,
  spain: 2035,
  sweden: 1810,
  switzerland: 1855,
  tunisia: 1710,
  turkey: 1760,
  uruguay: 1925,
  usa: 1880,
  uzbekistan: 1605,
  wales: 1685,
}

export function calculateTournamentProbabilities({ groups, matches, simulations = SIMULATION_COUNT }) {
  const teamMap = collectTeams(groups, matches)
  const teamIds = Array.from(teamMap.keys())

  if (!teamIds.length) return {}

  const groupMatches = normalizeGroupMatches(groups, matches)
  const baseRatings = buildBaseRatings(teamMap)
  const liveRatings = buildLiveRatings(baseRatings, matches)
  const eliminatedIds = knockoutEliminatedTeamIds(matches)

  const preTournament = runSimulations({
    groups,
    matches: groupMatches.map(match => ({ ...match, homeScore: null, awayScore: null, status: 'NS' })),
    ratings: baseRatings,
    simulations,
    seed: 20260611,
    eliminatedIds: new Set(),
  })

  const current = runSimulations({
    groups,
    matches: groupMatches,
    ratings: liveRatings,
    simulations,
    seed: 20260615,
    eliminatedIds,
  })

  return Object.fromEntries(teamIds.map(teamId => {
    const team = teamMap.get(teamId)
    const currentCounts = current[teamId] || emptyCounts()
    const preCounts = preTournament[teamId] || emptyCounts()
    const championProbability = currentCounts.champion / simulations
    const preTournamentProbability = preCounts.champion / simulations

    return [teamId, {
      teamId,
      teamName: team.name,
      baseRating: Math.round(baseRatings[teamId] || 1600),
      liveRating: Math.round(liveRatings[teamId] || baseRatings[teamId] || 1600),
      formRatingDelta: Math.round((liveRatings[teamId] || 1600) - (baseRatings[teamId] || 1600)),
      preTournamentProbability,
      championProbability,
      currentWinProbability: championProbability,
      groupAdvanceProbability: currentCounts.advance / simulations,
      roundOf32Probability: currentCounts.r32 / simulations,
      roundOf16Probability: currentCounts.r16 / simulations,
      quarterFinalProbability: currentCounts.qf / simulations,
      semiFinalProbability: currentCounts.sf / simulations,
      finalProbability: currentCounts.final / simulations,
    }]
  }))
}

export function attachProbabilitiesToGroups(groups, probabilities) {
  return groups.map(group => ({
    ...group,
    teams: group.teams.map(team => attachProbability(team, probabilities)),
  }))
}

export function attachProbabilitiesToMatches(matches, probabilities) {
  return matches.map(match => ({
    ...match,
    home: attachProbability(match.home, probabilities),
    away: attachProbability(match.away, probabilities),
  }))
}

export function fallbackPoolWinProbability(teamId, pool, teamPool) {
  const availableTeams = pool
    .map(id => teamPool.find(team => team.id === id))
    .filter(Boolean)
  const hasModelProbability = availableTeams.some(team => Number(team.currentWinProbability) > 0)
  const hasPreTournamentProbability = availableTeams.some(team => Number(team.preTournamentWinProbability) > 0)
  const hasOdds = availableTeams.some(team => Number(team.preOdds) > 0)

  if (hasModelProbability) {
    return Number(teamPool.find(team => team.id === teamId)?.currentWinProbability) || 0
  }

  if (hasPreTournamentProbability) {
    return Number(teamPool.find(team => team.id === teamId)?.preTournamentWinProbability) || 0
  }

  if (!hasOdds) return pool.length ? 1 / pool.length : 0

  const totalOdds = availableTeams.reduce((sum, team) => sum + (Number(team.preOdds) || 0), 0)
  const teamOdds = Number(teamPool.find(team => team.id === teamId)?.preOdds) || 0
  return totalOdds > 0 ? teamOdds / totalOdds : 0
}

function attachProbability(team, probabilities) {
  if (!team) return team

  const probability = probabilities[team.id]

  return {
    ...team,
    probability,
    currentWinProbability: probability?.championProbability ?? team.currentWinProbability ?? 0,
    preTournamentWinProbability: probability?.preTournamentProbability ?? team.preTournamentWinProbability ?? 0,
    groupAdvanceProbability: probability?.groupAdvanceProbability ?? team.groupAdvanceProbability ?? 0,
    liveRating: probability?.liveRating ?? team.liveRating,
    baseRating: probability?.baseRating ?? team.baseRating,
    formRatingDelta: probability?.formRatingDelta ?? team.formRatingDelta ?? 0,
  }
}

function runSimulations({ groups, matches, ratings, simulations, seed, eliminatedIds }) {
  const rng = createRng(seed)
  const counts = Object.fromEntries(collectTeams(groups, matches).keys().map(teamId => [teamId, emptyCounts()]))
  const groupMatchMap = new Map(matches.map(match => [match.id, match]))

  for (let index = 0; index < simulations; index += 1) {
    const rankedGroups = simulateGroups(groups, groupMatchMap, ratings, rng)
    const qualifiers = selectQualifiers(rankedGroups, ratings, rng)
      .filter(team => !eliminatedIds.has(team.id))

    qualifiers.forEach(team => {
      ensureCounts(counts, team.id).advance += 1
      ensureCounts(counts, team.id).r32 += qualifiers.length > 16 ? 1 : 0
      ensureCounts(counts, team.id).r16 += qualifiers.length <= 16 ? 1 : 0
    })

    const champion = simulateKnockout(qualifiers, ratings, rng, counts)
    if (champion) ensureCounts(counts, champion.id).champion += 1
  }

  return counts
}

function simulateGroups(groups, matchMap, ratings, rng) {
  const matchesByGroup = new Map()

  matchMap.forEach(match => {
    if (!match.group) return
    const groupMatches = matchesByGroup.get(match.group) || []
    groupMatches.push(match)
    matchesByGroup.set(match.group, groupMatches)
  })

  return groups.map(group => {
    const standings = new Map(group.teams.map(team => [team.id, {
      ...team,
      played: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    }]))

    const scheduledMatches = completeGroupSchedule(group, matchesByGroup.get(group.id) || [])

    scheduledMatches.forEach(match => {
      const home = standings.get(match.home?.id)
      const away = standings.get(match.away?.id)
      if (!home || !away) return

      const score = isPlayed(match)
        ? { home: match.homeScore, away: match.awayScore }
        : simulateScore(home, away, ratings, rng)

      applyGroupResult(home, score.home, score.away)
      applyGroupResult(away, score.away, score.home)
    })

    return {
      id: group.id,
      teams: rankTeams(Array.from(standings.values()), ratings, rng),
    }
  })
}

function completeGroupSchedule(group, existingMatches) {
  const matches = [...existingMatches]
  const existingPairs = new Set(existingMatches.map(match => pairKey(match.home?.id, match.away?.id)))

  group.teams.forEach((home, homeIndex) => {
    group.teams.slice(homeIndex + 1).forEach(away => {
      const key = pairKey(home.id, away.id)
      if (existingPairs.has(key)) return

      matches.push({
        id: `${group.id}-${home.id}-${away.id}`,
        group: group.id,
        home,
        away,
        homeScore: null,
        awayScore: null,
        status: 'NS',
      })
    })
  })

  return matches
}

function selectQualifiers(rankedGroups, ratings, rng) {
  if (rankedGroups.length >= 12) {
    const groupWinners = rankedGroups.map(group => ({ ...group.teams[0], groupFinish: 1 })).filter(Boolean)
    const runnersUp = rankedGroups.map(group => ({ ...group.teams[1], groupFinish: 2 })).filter(Boolean)
    const thirdPlaced = rankedGroups
      .map(group => group.teams[2] ? { ...group.teams[2], groupFinish: 3 } : null)
      .filter(Boolean)
      .sort((a, b) => compareTableTeams(a, b, ratings, rng))
      .slice(0, 8)

    return seedQualifiers([...groupWinners, ...runnersUp, ...thirdPlaced], ratings)
  }

  return seedQualifiers(
    rankedGroups.flatMap(group => group.teams.slice(0, 2).map((team, index) => ({ ...team, groupFinish: index + 1 }))),
    ratings
  )
}

function seedQualifiers(teams, ratings) {
  return [...teams].sort((a, b) =>
    a.groupFinish - b.groupFinish ||
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    ratingOf(b, ratings) - ratingOf(a, ratings)
  )
}

function simulateKnockout(qualifiedTeams, ratings, rng, counts) {
  let teams = pairSeeds(qualifiedTeams)
  let roundIndex = qualifiedTeams.length > 16 ? 0 : 1
  const roundTargets = ['r16', 'qf', 'sf', 'final', 'champion']

  while (teams.length > 1) {
    const winners = []

    for (let index = 0; index < teams.length; index += 2) {
      const winner = simulateKnockoutMatch(teams[index], teams[index + 1], ratings, rng)
      if (winner) winners.push(winner)
    }

    const target = roundTargets[roundIndex]
    if (target && target !== 'champion') {
      winners.forEach(team => {
        ensureCounts(counts, team.id)[target] += 1
      })
    }

    teams = pairSeeds(winners)
    roundIndex += 1
  }

  return teams[0] || null
}

function pairSeeds(teams) {
  const paired = []
  const ordered = [...teams]

  while (ordered.length) {
    paired.push(ordered.shift())
    if (ordered.length) paired.push(ordered.pop())
  }

  return paired
}

function simulateKnockoutMatch(home, away, ratings, rng) {
  if (!home) return away
  if (!away) return home

  const score = simulateScore(home, away, ratings, rng)
  if (score.home > score.away) return home
  if (score.away > score.home) return away

  const homeWinProbability = winProbability(home, away, ratings)
  return rng() < homeWinProbability ? home : away
}

function simulateScore(home, away, ratings, rng) {
  const diff = ratingOf(home, ratings) - ratingOf(away, ratings)
  const homeGoals = poisson(clamp(0.35, 3.4, 1.35 + diff / 650), rng)
  const awayGoals = poisson(clamp(0.35, 3.4, 1.15 - diff / 700), rng)

  return { home: homeGoals, away: awayGoals }
}

function buildLiveRatings(baseRatings, matches) {
  const ratings = { ...baseRatings }

  matches
    .filter(match => isPlayed(match))
    .sort((a, b) => toTimestamp(a.kickoff) - toTimestamp(b.kickoff))
    .forEach(match => {
      const homeId = match.home?.id
      const awayId = match.away?.id
      if (!homeId || !awayId) return

      const homeRating = ratings[homeId] || 1600
      const awayRating = ratings[awayId] || 1600
      const expectedHome = 1 / (1 + 10 ** ((awayRating - homeRating) / 400))
      const actualHome = match.homeScore > match.awayScore ? 1 : match.homeScore === match.awayScore ? 0.5 : 0
      const margin = Math.abs(match.homeScore - match.awayScore)
      const marginMultiplier = Math.log(margin + 1) * 0.8 + 1
      const ratingChange = 22 * marginMultiplier * (actualHome - expectedHome)

      ratings[homeId] = homeRating + ratingChange
      ratings[awayId] = awayRating - ratingChange
    })

  return ratings
}

function buildBaseRatings(teamMap) {
  return Object.fromEntries(Array.from(teamMap.values()).map(team => [
    team.id,
    BASE_RATINGS[normalizeTeamName(team.name)] || ratingFromFallback(team),
  ]))
}

function ratingFromFallback(team) {
  if (team.fifaRank) return clamp(1450, 2000, 2020 - Number(team.fifaRank) * 7.2)
  if (team.preOdds) return clamp(1450, 2050, 1600 + Math.log1p(Number(team.preOdds) * 100) * 95)
  return 1600
}

function collectTeams(groups, matches) {
  const teams = new Map()

  groups.forEach(group => {
    group.teams.forEach(team => {
      teams.set(team.id, team)
    })
  })

  matches.forEach(match => {
    if (match.home?.id) teams.set(match.home.id, match.home)
    if (match.away?.id) teams.set(match.away.id, match.away)
  })

  return teams
}

function normalizeGroupMatches(groups, matches) {
  const knownTeamIds = new Set(groups.flatMap(group => group.teams.map(team => team.id)))

  return matches
    .filter(match => match.group && match.home?.id && match.away?.id)
    .filter(match => knownTeamIds.has(match.home.id) && knownTeamIds.has(match.away.id))
}

function knockoutEliminatedTeamIds(matches) {
  const eliminated = new Set()

  matches
    .filter(match => match.roundNumber >= 4 && isPlayed(match))
    .forEach(match => {
      if (match.homeScore > match.awayScore && match.away?.id) eliminated.add(match.away.id)
      if (match.awayScore > match.homeScore && match.home?.id) eliminated.add(match.home.id)
    })

  return eliminated
}

function applyGroupResult(team, goalsFor, goalsAgainst) {
  team.played += 1
  team.gf += goalsFor
  team.ga += goalsAgainst
  team.gd = team.gf - team.ga

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

function rankTeams(teams, ratings, rng) {
  return [...teams].sort((a, b) => compareTableTeams(a, b, ratings, rng))
}

function compareTableTeams(a, b, ratings, rng) {
  return b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    ratingOf(b, ratings) - ratingOf(a, ratings) ||
    rng() - 0.5
}

function winProbability(home, away, ratings) {
  const diff = ratingOf(home, ratings) - ratingOf(away, ratings)
  return 1 / (1 + 10 ** (-diff / 400))
}

function ratingOf(team, ratings) {
  return ratings[team?.id] || 1600
}

function isPlayed(match) {
  if (match.homeScore === null || match.homeScore === undefined) return false
  if (match.awayScore === null || match.awayScore === undefined) return false

  const status = String(match.status || '').toLowerCase()
  return status !== 'ns' && status !== 'postponed'
}

function pairKey(homeId, awayId) {
  return [homeId, awayId].filter(Boolean).sort().join(':')
}

function poisson(lambda, rng) {
  const limit = Math.exp(-lambda)
  let product = 1
  let count = 0

  do {
    count += 1
    product *= rng()
  } while (product > limit)

  return Math.min(count - 1, 8)
}

function createRng(seed) {
  let value = seed >>> 0

  return () => {
    value += 0x6D2B79F5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function emptyCounts() {
  return {
    advance: 0,
    r32: 0,
    r16: 0,
    qf: 0,
    sf: 0,
    final: 0,
    champion: 0,
  }
}

function ensureCounts(counts, teamId) {
  if (!counts[teamId]) counts[teamId] = emptyCounts()
  return counts[teamId]
}

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value))
}

function toTimestamp(value) {
  if (!value) return Number.NaN
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}
