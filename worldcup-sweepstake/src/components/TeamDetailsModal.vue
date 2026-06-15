<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <section class="team-modal" role="dialog" aria-modal="true" :aria-label="`${team?.name || 'Team'} details`">
        <header class="modal-header">
          <div class="team-heading">
            <TeamMark :team="team" :size="70" />
            <div class="min-w-0">
              <p class="eyebrow">Team profile</p>
              <h2>{{ team?.name || 'Team' }}</h2>
              <div class="heading-meta">
                <span v-if="team?.group">Group {{ team.group }}</span>
                <span v-if="team?.rank">Group rank #{{ team.rank }}</span>
                <span>{{ ownerName }}</span>
              </div>
            </div>
          </div>

          <button class="close-button" @click="$emit('close')" aria-label="Close team details">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </header>

        <div class="owner-strip">
          <img
            v-if="player?.photoURL"
            :src="player.photoURL"
            :alt="player.displayName"
            class="owner-avatar"
          />
          <span v-else class="owner-avatar owner-initials">{{ ownerInitials }}</span>
          <div class="min-w-0">
            <span>Owner</span>
            <strong>{{ ownerName }}</strong>
          </div>
        </div>

        <div class="hero-metrics">
          <div class="hero-metric">
            <span>Win now</span>
            <strong>{{ formatProbability(team?.currentWinProbability) }}</strong>
            <small>{{ formatProbability(team?.preTournamentWinProbability) }} pre</small>
          </div>
          <div class="hero-metric">
            <span>Advance</span>
            <strong>{{ formatProbability(team?.groupAdvanceProbability) }}</strong>
            <small>Reach knockouts</small>
          </div>
          <div class="hero-metric">
            <span>Final</span>
            <strong>{{ formatProbability(team?.finalProbability) }}</strong>
            <small>Reach final</small>
          </div>
          <div class="hero-metric" :class="ratingDeltaClass">
            <span>Form</span>
            <strong>{{ formatSignedNumber(team?.formRatingDelta) }}</strong>
            <small>{{ formatRating(team?.liveRating) }} rating</small>
          </div>
        </div>

        <div class="detail-grid">
          <section class="detail-card">
            <h3>Table Stats</h3>
            <div class="stat-grid">
              <div><span>Played</span><strong>{{ team?.played ?? 0 }}</strong></div>
              <div><span>Wins</span><strong>{{ team?.w ?? 0 }}</strong></div>
              <div><span>Draws</span><strong>{{ team?.d ?? 0 }}</strong></div>
              <div><span>Losses</span><strong>{{ team?.l ?? 0 }}</strong></div>
              <div><span>Goals</span><strong>{{ team?.gf ?? 0 }}-{{ team?.ga ?? 0 }}</strong></div>
              <div><span>GD</span><strong>{{ formatGoalDiff(team?.gd) }}</strong></div>
              <div><span>Points</span><strong>{{ team?.pts ?? 0 }}</strong></div>
              <div><span>Base rating</span><strong>{{ formatRating(team?.baseRating) }}</strong></div>
            </div>
          </section>

          <section class="detail-card">
            <h3>Ranking Movement</h3>
            <div v-if="rankMovement" class="movement-summary" :class="movementClass(rankMovement.delta)">
              <span class="movement-arrow">
                <svg v-if="rankMovement.delta > 0" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5"/>
                  <path d="m5 12 7-7 7 7"/>
                </svg>
                <svg v-else-if="rankMovement.delta < 0" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14"/>
                  <path d="m19 12-7 7-7-7"/>
                </svg>
                <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"/>
                </svg>
              </span>
              <div>
                <strong>{{ movementLabel(rankMovement.delta) }}</strong>
                <small>Current #{{ rankMovement.currentRank }} from pre #{{ rankMovement.preRank }}</small>
              </div>
            </div>
            <div v-else class="empty-copy">Ranking movement is available in the live leaderboard.</div>
          </section>
        </div>

        <section class="detail-card">
          <h3>Matches</h3>
          <div v-if="teamMatches.length" class="match-list">
            <article v-for="match in teamMatches" :key="match.id" class="match-row">
              <div class="match-teams">
                <TeamMark :team="match.home" :size="24" />
                <span>{{ match.home?.name || 'TBD' }}</span>
                <strong>{{ scoreLabel(match) }}</strong>
                <span>{{ match.away?.name || 'TBD' }}</span>
                <TeamMark :team="match.away" :size="24" />
              </div>
              <div class="match-meta">
                <span>{{ formatKickoff(match.kickoff) }}</span>
                <span>{{ match.group ? `Group ${match.group}` : match.round || 'Match' }}</span>
              </div>
            </article>
          </div>
          <div v-else class="empty-copy">No matches available for this team yet.</div>
        </section>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import TeamMark from './TeamMark.vue'

const props = defineProps({
  team: { type: Object, required: true },
  player: { type: Object, default: null },
  matches: { type: Array, default: () => [] },
  rankMovement: { type: Object, default: null },
})

defineEmits(['close'])

const ownerName = computed(() => {
  const name = props.player?.displayName || ''
  return firstName(name) || name || 'Unclaimed'
})

const ownerInitials = computed(() => {
  const source = props.player?.displayName || '?'
  return String(source).trim().charAt(0).toUpperCase() || '?'
})

const teamMatches = computed(() =>
  props.matches
    .filter(match => match.home?.id === props.team?.id || match.away?.id === props.team?.id)
    .sort((a, b) => toTimestamp(a.kickoff) - toTimestamp(b.kickoff))
)

const ratingDeltaClass = computed(() => {
  const delta = Number(props.team?.formRatingDelta ?? 0)
  if (delta > 0) return 'is-positive'
  if (delta < 0) return 'is-negative'
  return ''
})

function firstName(name = '') {
  return String(name).trim().split(' ')[0] || ''
}

function formatProbability(value) {
  const number = Number(value ?? 0)
  if (number > 0 && number < 0.001) return '<0.1%'
  return `${(number * 100).toFixed(1)}%`
}

function formatRating(value) {
  return Math.round(Number(value ?? 1600))
}

function formatSignedNumber(value) {
  const number = Math.round(Number(value ?? 0))
  return number > 0 ? `+${number}` : String(number)
}

function formatGoalDiff(value) {
  const number = Number(value ?? 0)
  return number > 0 ? `+${number}` : String(number)
}

function scoreLabel(match) {
  if (hasScore(match.homeScore) && hasScore(match.awayScore)) return `${match.homeScore}-${match.awayScore}`
  return 'vs'
}

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

function movementClass(delta) {
  if (delta > 0) return 'is-up'
  if (delta < 0) return 'is-down'
  return 'is-flat'
}

function movementLabel(delta) {
  if (delta > 0) return `Climbed ${delta} places`
  if (delta < 0) return `Dropped ${Math.abs(delta)} places`
  return 'No position change'
}

function toTimestamp(value) {
  if (!value) return Number.MAX_SAFE_INTEGER
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(5, 0, 10, 0.74);
  backdrop-filter: blur(10px);
}

.team-modal {
  width: min(920px, 100%);
  max-height: min(86vh, 900px);
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(168, 85, 247, 0.38);
  background: #12001c;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
  border-bottom: 1px solid rgba(124, 58, 237, 0.18);
}

.team-heading {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 3px;
  color: #67e8f9;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.team-heading h2 {
  margin: 0;
  color: #fff;
  font-size: 30px;
  line-height: 1.05;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.heading-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
  color: #9ca3af;
  font-size: 12px;
}

.heading-meta span,
.owner-strip {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.055);
}

.heading-meta span {
  padding: 4px 8px;
  border-radius: 999px;
}

.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #d1d5db;
  background: rgba(255, 255, 255, 0.06);
  transition: background 0.2s ease, color 0.2s ease;
}

.close-button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.11);
}

.owner-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 22px 0;
  padding: 10px;
  border-radius: 10px;
}

.owner-strip span,
.hero-metric span,
.stat-grid span,
.movement-summary small,
.empty-copy {
  color: #9ca3af;
  font-size: 12px;
}

.owner-strip strong {
  display: block;
  color: #fff;
  font-size: 14px;
}

.owner-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.owner-initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7C3AED, #A855F7);
  color: #fff;
  font-weight: 900;
}

.hero-metrics,
.detail-grid {
  display: grid;
  gap: 12px;
  padding: 16px 22px 0;
}

.hero-metrics {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.detail-grid {
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
}

.hero-metric,
.detail-card {
  border-radius: 10px;
  border: 1px solid rgba(124, 58, 237, 0.2);
  background: rgba(255, 255, 255, 0.045);
}

.hero-metric {
  padding: 12px;
}

.hero-metric strong {
  display: block;
  margin-top: 4px;
  color: #fff;
  font-size: 24px;
  line-height: 1;
  font-weight: 900;
}

.hero-metric small {
  display: block;
  margin-top: 5px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
}

.hero-metric.is-positive strong {
  color: #86efac;
}

.hero-metric.is-negative strong {
  color: #fca5a5;
}

.detail-card {
  padding: 14px;
}

.team-modal > .detail-card {
  margin: 16px 22px 22px;
}

.detail-card h3 {
  margin: 0 0 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 900;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.stat-grid div {
  min-width: 0;
  padding: 9px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.stat-grid strong {
  display: block;
  margin-top: 3px;
  color: #f9fafb;
  font-size: 15px;
  font-weight: 900;
}

.movement-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 86px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.movement-summary strong {
  display: block;
  color: #fff;
  font-size: 16px;
  font-weight: 900;
}

.movement-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  height: 34px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.movement-summary.is-up .movement-arrow {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
}

.movement-summary.is-down .movement-arrow {
  background: rgba(248, 113, 113, 0.16);
  color: #fca5a5;
}

.movement-summary.is-flat .movement-arrow {
  background: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.match-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
}

.match-teams {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto minmax(0, 1fr) 24px;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.match-teams span {
  overflow: hidden;
  color: #e5e7eb;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-teams span:nth-of-type(2) {
  text-align: right;
}

.match-teams strong {
  color: #fff;
  font-size: 13px;
}

.match-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #6b7280;
  font-size: 11px;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .modal-backdrop {
    align-items: flex-end;
    padding: 10px;
  }

  .team-modal {
    max-height: 92vh;
  }

  .modal-header {
    padding: 18px;
  }

  .team-heading {
    gap: 12px;
  }

  .team-heading h2 {
    font-size: 24px;
  }

  .hero-metrics,
  .detail-grid,
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }

  .detail-grid {
    padding-top: 12px;
  }

  .match-row {
    grid-template-columns: 1fr;
  }

  .match-meta {
    align-items: flex-start;
  }
}

@media (max-width: 520px) {
  .hero-metrics,
  .detail-grid,
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .match-teams {
    grid-template-columns: 24px minmax(0, 1fr) auto;
  }

  .match-teams span:nth-of-type(2),
  .match-teams :last-child {
    display: none;
  }
}
</style>
