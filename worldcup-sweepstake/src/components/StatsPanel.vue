<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <section class="stats-card">
      <div class="stats-heading">Live Win Chances</div>
      <div
        v-for="team in liveFavorites"
        :key="team.id"
        class="stats-row"
      >
        <TeamMark :team="team" />
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ team.name }}</div>
          <div class="stats-secondary">
            {{ formatDelta(team.currentWinProbability, team.preTournamentWinProbability) }} from pre-tournament
          </div>
        </div>
        <span class="stats-value">{{ formatProbability(team.currentWinProbability) }}</span>
      </div>
    </section>

    <section class="stats-card">
      <div class="stats-heading">{{ topGoalscorers.length ? 'Goalscorers' : 'Team Goals' }}</div>

      <div
        v-for="player in topGoalscorers"
        v-if="topGoalscorers.length"
        :key="`${player.player}-${player.team?.id}`"
        class="stats-row"
      >
        <TeamMark :team="player.team" />
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ player.player }}</div>
          <div class="stats-secondary">{{ player.team?.name }}</div>
        </div>
        <span class="stats-value">{{ player.goals }}</span>
      </div>

      <div
        v-for="team in topScoringTeams"
        v-else
        :key="team.id"
        class="stats-row"
      >
        <TeamMark :team="team" />
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ team.name }}</div>
          <div class="stats-secondary">Group {{ team.group }}</div>
        </div>
        <span class="stats-value">{{ team.gf }}</span>
      </div>
    </section>

    <section class="stats-card">
      <div class="stats-heading">{{ topCards.length ? 'Cards' : 'Group Leaders' }}</div>

      <div
        v-for="player in topCards"
        v-if="topCards.length"
        :key="`${player.player}-${player.team?.id}`"
        class="stats-row"
      >
        <TeamMark :team="player.team" />
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ player.player }}</div>
          <div class="stats-secondary">{{ player.team?.name }}</div>
        </div>
        <span class="stats-value">{{ player.totalCards }}</span>
      </div>

      <div
        v-for="leader in groupLeaders"
        v-else
        :key="leader.id"
        class="stats-row"
      >
        <TeamMark :team="leader" />
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ leader.name }}</div>
          <div class="stats-secondary">Group {{ leader.group }}</div>
        </div>
        <span class="stats-value">{{ leader.pts }}</span>
      </div>
    </section>

    <section class="stats-card">
      <div class="stats-heading">Best Attacks</div>
      <div
        v-for="team in bestAttacks"
        :key="team.id"
        class="stats-row"
      >
        <TeamMark :team="team" />
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ team.name }}</div>
          <div class="stats-secondary">{{ team.played }} played</div>
        </div>
        <span class="stats-value">{{ team.gf }}</span>
      </div>
    </section>

    <section class="stats-card">
      <div class="stats-heading">{{ biggestResults.length ? 'Biggest Results' : 'Next Matches' }}</div>
      <div
        v-for="match in biggestResults"
        v-if="biggestResults.length"
        :key="match.id"
        class="stats-row"
      >
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ match.home?.name }} {{ match.homeScore }}-{{ match.awayScore }} {{ match.away?.name }}</div>
          <div class="stats-secondary">{{ match.group ? `Group ${match.group}` : match.round }}</div>
        </div>
        <span class="stats-value">+{{ Math.abs(match.homeScore - match.awayScore) }}</span>
      </div>

      <div
        v-for="match in nextMatches"
        v-else
        :key="match.id"
        class="stats-row"
      >
        <div class="min-w-0 flex-1">
          <div class="stats-primary">{{ match.home?.name }} vs {{ match.away?.name }}</div>
          <div class="stats-secondary">{{ formatKickoff(match.kickoff) }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TeamMark from './TeamMark.vue'

const props = defineProps({
  goalscorers: { type: Array, default: () => [] },
  cards: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  matches: { type: Array, default: () => [] },
})

const allTeams = computed(() =>
  props.groups.flatMap(group => group.teams.map(team => ({ ...team, group: group.id })))
)

const topGoalscorers = computed(() =>
  [...props.goalscorers]
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 8)
)

const topCards = computed(() =>
  [...props.cards]
    .sort((a, b) => b.totalCards - a.totalCards || b.redCards - a.redCards)
    .slice(0, 8)
)

const liveFavorites = computed(() =>
  [...allTeams.value]
    .sort((a, b) => Number(b.currentWinProbability || 0) - Number(a.currentWinProbability || 0))
    .slice(0, 8)
)

const topScoringTeams = computed(() =>
  [...allTeams.value]
    .sort((a, b) => b.gf - a.gf || b.gd - a.gd || b.pts - a.pts)
    .slice(0, 8)
)

const groupLeaders = computed(() =>
  props.groups
    .map(group => group.teams[0] ? { ...group.teams[0], group: group.id } : null)
    .filter(Boolean)
    .slice(0, 8)
)

const bestAttacks = computed(() =>
  [...allTeams.value]
    .sort((a, b) => b.gf - a.gf || b.pts - a.pts)
    .slice(0, 8)
)

const biggestResults = computed(() =>
  props.matches
    .filter(match => hasScore(match.homeScore) && hasScore(match.awayScore))
    .sort((a, b) => {
      const diff = Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore)
      if (diff !== 0) return diff
      return (b.homeScore + b.awayScore) - (a.homeScore + a.awayScore)
    })
    .slice(0, 8)
)

const nextMatches = computed(() =>
  props.matches
    .filter(match => !hasScore(match.homeScore) || !hasScore(match.awayScore))
    .slice(0, 8)
)

function hasScore(value) {
  return value !== null && value !== undefined
}

function formatKickoff(value) {
  if (!value) return 'TBD'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatProbability(value) {
  const number = Number(value ?? 0)
  if (number > 0 && number < 0.001) return '<0.1%'
  return `${(number * 100).toFixed(1)}%`
}

function formatDelta(current, preTournament) {
  const delta = Number(current ?? 0) - Number(preTournament ?? 0)
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${(delta * 100).toFixed(1)} pts`
}

</script>

<style scoped>
.stats-card {
  overflow: hidden;
  border-radius: 12px;
  background: rgba(22, 0, 32, 0.7);
  border: 1px solid rgba(124, 58, 237, 0.25);
}

.stats-heading {
  padding: 12px 16px;
  color: #fff;
  font-weight: 600;
  border-bottom: 1px solid rgba(124, 58, 237, 0.2);
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(124, 58, 237, 0.12);
}

.stats-primary,
.stats-secondary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-primary {
  color: #e5e7eb;
  font-size: 14px;
}

.stats-secondary {
  color: #6b7280;
  font-size: 12px;
}

.stats-value {
  flex-shrink: 0;
  color: #fff;
  font-weight: 700;
}

</style>
