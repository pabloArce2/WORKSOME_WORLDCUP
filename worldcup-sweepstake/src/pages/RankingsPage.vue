<template>
  <div class="relative min-h-screen overflow-hidden" style="background-color: #0D0014;">
    <div class="blob w-96 h-96 -top-20 -right-20" style="background: #6B21A8;"></div>
    <div class="blob w-96 h-96 bottom-0 -left-20" style="background: #14532D;"></div>
    <div class="grid-overlay absolute inset-0 pointer-events-none"></div>

    <div class="relative z-10 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
      <header class="flex items-center justify-between gap-4">
        <WorksomeLogo />

        <div class="flex items-center gap-2">
          <button
            @click="router.push('/dashboard')"
            class="nav-button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Dashboard
          </button>
          <button
            @click="signOut"
            class="nav-button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </header>

      <UserBanner :team-probability="userTeamProbability" />

      <section class="leaderboard-head">
        <div class="min-w-0">
          <p class="eyebrow">Live probability model</p>
          <h1 class="page-title">Who Is Winning?</h1>
          <p class="page-subtitle">
            The ranking blends pre-tournament strength, match results, group position, and simulated knockout paths.
          </p>
        </div>

        <div class="status-card">
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="loadingData ? 'bg-yellow-300 animate-pulse' : dataSource === 'fallback' ? 'bg-purple-400' : 'bg-green-400 animate-pulse'"
            ></span>
            <span>{{ dataStatusLabel }}</span>
          </div>
          <button
            @click="refreshTournamentData"
            :disabled="loadingData"
            class="refresh-button"
          >
            Refresh
          </button>
        </div>
      </section>

      <div
        v-if="dataError"
        class="rounded-lg px-4 py-3 text-sm"
        style="background: rgba(127, 29, 29, 0.24); border: 1px solid rgba(248, 113, 113, 0.35); color: #FCA5A5;"
      >
        {{ dataError }}
      </div>

      <section class="model-docs">
        <div class="model-docs__intro">
          <p class="eyebrow">Model guide</p>
          <h2>What The Numbers Mean</h2>
          <p>
            The model simulates the tournament many times. It starts with team strength, updates ratings from real results,
            then runs the remaining group and knockout games to estimate each team's path.
          </p>
        </div>

        <div class="model-docs__grid">
          <div>
            <strong>Win now</strong>
            <span>Chance this team wins the World Cup from the current situation.</span>
          </div>
          <div>
            <strong>Pre</strong>
            <span>Chance before any tournament results were applied.</span>
          </div>
          <div>
            <strong>Advance</strong>
            <span>Chance of reaching the knockout rounds from the group.</span>
          </div>
          <div>
            <strong>Final</strong>
            <span>Chance of reaching the final match, not necessarily winning it.</span>
          </div>
          <div>
            <strong>Rating</strong>
            <span>Live team strength. Higher means the simulator trusts the team more.</span>
          </div>
          <div>
            <strong>Form</strong>
            <span>How much the live rating has moved compared with the starting rating.</span>
          </div>
        </div>
      </section>

      <section class="podium-grid" aria-label="Top three teams">
        <article
          v-for="team in podiumTeams"
          :key="team.id"
          class="podium-card"
          :class="[`rank-${team.rank}`, { 'is-user-team': team.id === store.team?.id }]"
          :style="accentVars(team.rank)"
        >
          <div class="podium-rank">#{{ team.rank }}</div>

          <div class="podium-ring" :style="ringStyle(team)">
            <div class="podium-ring-inner">
              <TeamMark :team="team" :size="team.rank === 1 ? 92 : 74" />
            </div>
          </div>

          <div class="podium-team">
            <h2>{{ team.name }}</h2>
            <div class="owner-pill" :class="{ 'is-empty': !playerFor(team) }">
              <img
                v-if="playerFor(team)?.photoURL"
                :src="playerFor(team).photoURL"
                :alt="playerFor(team).displayName"
                class="owner-avatar"
              />
              <span v-else class="owner-avatar owner-initials">{{ ownerInitials(team) }}</span>
              <span>{{ ownerName(team) }}</span>
            </div>
          </div>

          <div class="podium-chance">
            <strong>{{ formatProbability(team.currentWinProbability) }}</strong>
            <span>{{ formatProbabilityDelta(team) }} vs pre</span>
          </div>

          <div class="path-strip">
            <div>
              <span>Advance</span>
              <strong>{{ formatProbability(team.groupAdvanceProbability) }}</strong>
            </div>
            <div>
              <span>Final</span>
              <strong>{{ formatProbability(team.finalProbability) }}</strong>
            </div>
            <div>
              <span>Rating</span>
              <strong>{{ formatRating(team.liveRating) }}</strong>
            </div>
          </div>
        </article>
      </section>

      <section class="ranking-panel">
        <div class="ranking-heading">
          <div>
            <p class="eyebrow">Rest of the field</p>
            <h2>Live Leaderboard</h2>
          </div>
          <span>{{ rankedTeams.length }} teams</span>
        </div>

        <div class="ranking-list">
          <article
            v-for="team in restTeams"
            :key="team.id"
            class="ranking-row"
            :class="{ 'is-user-team': team.id === store.team?.id }"
          >
            <div class="rank-number">#{{ team.rank }}</div>

            <div class="team-cell">
              <TeamMark :team="team" :size="42" />
              <div class="team-info">
                <div class="team-name">{{ team.name }}</div>
                <div class="team-meta">
                  <span v-if="team.group">Group {{ team.group }}</span>
                </div>
              </div>
              <div class="ranking-owner" :class="{ 'is-empty': !playerFor(team) }">
                <img
                  v-if="playerFor(team)?.photoURL"
                  :src="playerFor(team).photoURL"
                  :alt="playerFor(team).displayName"
                  class="ranking-owner__avatar"
                />
                <span v-else class="ranking-owner__avatar ranking-owner__initials">{{ ownerInitials(team) }}</span>
                <span>{{ ownerName(team) }}</span>
              </div>
            </div>

            <div class="mini-stat">
              <span>Pts</span>
              <strong>{{ team.pts ?? 0 }}</strong>
            </div>

            <div class="mini-stat">
              <span>Rating</span>
              <strong>{{ formatRating(team.liveRating) }}</strong>
            </div>

            <div class="mini-stat delta-stat" :class="ratingDeltaClass(team)">
              <span>Form</span>
              <strong>{{ formatRatingDelta(team.formRatingDelta) }}</strong>
            </div>

            <div class="chance-cell">
              <div class="chance-topline">
                <span>{{ formatProbability(team.currentWinProbability) }}</span>
                <span>{{ formatProbability(team.preTournamentWinProbability) }} pre</span>
              </div>
              <div class="chance-bar">
                <div :style="barStyle(team)"></div>
              </div>
            </div>
          </article>
        </div>

        <div
          v-if="!rankedTeams.length && !loadingData"
          class="empty-state"
        >
          No ranking data available yet.
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase.js'
import { useUserStore } from '../stores/user.js'
import TeamMark from '../components/TeamMark.vue'
import UserBanner from '../components/UserBanner.vue'
import WorksomeLogo from '../components/WorksomeLogo.vue'
import { getFallbackGroups, getTournamentSnapshot } from '../services/sportsDbApi.js'

const RANK_ACCENTS = {
  1: '#FBBF24',
  2: '#CBD5E1',
  3: '#F97316',
}

const store = useUserStore()
const router = useRouter()

const groups = ref(getFallbackGroups())
const probabilities = ref({})
const players = ref({})
const dataSource = ref('fallback')
const dataError = ref('')
const loadingData = ref(false)
const lastUpdatedAt = ref(null)

const unsubscribers = []
let refreshTimer = null

const rankedTeams = computed(() => {
  const byId = new Map()

  groups.value.forEach(group => {
    group.teams.forEach(team => {
      const probability = probabilities.value[team.id] ?? team.probability ?? {}
      byId.set(team.id, {
        ...team,
        group: team.group || group.id,
        currentWinProbability: probability.championProbability ?? team.currentWinProbability ?? 0,
        preTournamentWinProbability: probability.preTournamentProbability ?? team.preTournamentWinProbability ?? 0,
        groupAdvanceProbability: probability.groupAdvanceProbability ?? team.groupAdvanceProbability ?? 0,
        finalProbability: probability.finalProbability ?? team.finalProbability ?? 0,
        liveRating: probability.liveRating ?? team.liveRating ?? team.baseRating ?? 1600,
        baseRating: probability.baseRating ?? team.baseRating ?? 1600,
        formRatingDelta: probability.formRatingDelta ?? team.formRatingDelta ?? 0,
      })
    })
  })

  return Array.from(byId.values())
    .sort((a, b) =>
      Number(b.currentWinProbability || 0) - Number(a.currentWinProbability || 0) ||
      Number(b.liveRating || 0) - Number(a.liveRating || 0) ||
      String(a.name).localeCompare(String(b.name))
    )
    .map((team, index) => ({ ...team, rank: index + 1 }))
})

const podiumTeams = computed(() => rankedTeams.value.slice(0, 3))
const restTeams = computed(() => rankedTeams.value.slice(3))

const maxWinProbability = computed(() =>
  Math.max(0.001, ...rankedTeams.value.map(team => Number(team.currentWinProbability || 0)))
)

const userTeamProbability = computed(() => {
  const teamId = store.team?.id
  return teamId ? probabilities.value[teamId] ?? null : null
})

const dataStatusLabel = computed(() => {
  if (loadingData.value) return 'Updating model...'
  if (dataSource.value === 'api') return `TheSportsDB data ${formatUpdatedAt(lastUpdatedAt.value)}`
  if (dataSource.value === 'partial') return `Partial TheSportsDB data ${formatUpdatedAt(lastUpdatedAt.value)}`
  return 'Using local fallback data'
})

onMounted(() => {
  refreshTournamentData()
  refreshTimer = window.setInterval(refreshTournamentData, 180_000)

  unsubscribers.push(
    onSnapshot(doc(db, 'config', 'players'), snap => {
      players.value = snap.exists() ? snap.data() : {}
    })
  )

  if (auth.currentUser) {
    unsubscribers.push(
      onSnapshot(doc(db, 'users', auth.currentUser.uid), snap => {
        if (snap.exists()) store.setProfile(snap.data())
      })
    )
  }
})

onUnmounted(() => {
  unsubscribers.forEach(unsub => unsub())
  if (refreshTimer) window.clearInterval(refreshTimer)
})

async function refreshTournamentData() {
  loadingData.value = true

  try {
    const snapshot = await getTournamentSnapshot({ includeStats: false })
    groups.value = snapshot.groups
    probabilities.value = snapshot.probabilities ?? {}
    dataSource.value = snapshot.source
    dataError.value = snapshot.error
    lastUpdatedAt.value = snapshot.updatedAt
  } catch (error) {
    dataSource.value = 'fallback'
    dataError.value = error?.message || 'Could not load ranking data.'
    console.warn(error)
  } finally {
    loadingData.value = false
  }
}

async function signOut() {
  unsubscribers.forEach(unsub => unsub())
  if (refreshTimer) window.clearInterval(refreshTimer)
  await firebaseSignOut(auth)
  store.clearUser()
  router.push('/')
}

function playerFor(team) {
  return team?.id ? players.value[team.id] : null
}

function ownerName(team) {
  const player = playerFor(team)
  return firstName(player?.displayName) || player?.displayName || 'Unclaimed'
}

function ownerInitials(team) {
  const player = playerFor(team)
  const source = player?.displayName || '?'
  return String(source).trim().charAt(0).toUpperCase() || '?'
}

function firstName(name = '') {
  return String(name).trim().split(' ')[0] || ''
}

function formatProbability(value) {
  const number = Number(value ?? 0)
  if (number > 0 && number < 0.001) return '<0.1%'
  return `${(number * 100).toFixed(1)}%`
}

function formatProbabilityDelta(team) {
  const delta = Number(team.currentWinProbability ?? 0) - Number(team.preTournamentWinProbability ?? 0)
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${(delta * 100).toFixed(1)} pts`
}

function formatRating(value) {
  return Math.round(Number(value ?? 1600))
}

function formatRatingDelta(value) {
  const number = Math.round(Number(value ?? 0))
  return number > 0 ? `+${number}` : String(number)
}

function ratingDeltaClass(team) {
  const delta = Number(team.formRatingDelta ?? 0)
  if (delta > 0) return 'is-positive'
  if (delta < 0) return 'is-negative'
  return ''
}

function accentVars(rank) {
  return {
    '--accent': RANK_ACCENTS[rank] || '#A855F7',
  }
}

function ringStyle(team) {
  const progress = Math.max(0, Math.min(100, Number(team.currentWinProbability || 0) * 100))
  return {
    '--ring-progress': `${progress}%`,
    '--accent': RANK_ACCENTS[team.rank] || '#A855F7',
  }
}

function barStyle(team) {
  const percentage = Math.max(0, Math.min(100, (Number(team.currentWinProbability || 0) / maxWinProbability.value) * 100))

  return {
    width: `${percentage}%`,
    background: `linear-gradient(90deg, ${team.rank <= 3 ? RANK_ACCENTS[team.rank] : '#22C55E'}, #38BDF8)`,
  }
}

function formatUpdatedAt(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<style scoped>
.nav-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(124, 58, 237, 0.25);
  background: rgba(22, 0, 32, 0.8);
  color: #d1d5db;
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-button:hover {
  border-color: rgba(168, 85, 247, 0.55);
  color: #fff;
  transform: translateY(-1px);
}

.leaderboard-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
}

.eyebrow {
  margin: 0 0 4px;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.page-title {
  margin: 0;
  color: #fff;
  font-size: clamp(32px, 5vw, 60px);
  line-height: 1;
  font-weight: 900;
}

.page-subtitle {
  max-width: 680px;
  margin: 10px 0 0;
  color: #9ca3af;
  font-size: 15px;
  line-height: 1.55;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 10px 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(124, 58, 237, 0.25);
  background: rgba(22, 0, 32, 0.75);
  color: #9ca3af;
  font-size: 12px;
  white-space: nowrap;
}

.refresh-button {
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 7px;
  background: rgba(14, 165, 233, 0.14);
  color: #67e8f9;
  font-size: 12px;
  font-weight: 700;
  transition: opacity 0.2s ease, background 0.2s ease;
}

.refresh-button:disabled {
  opacity: 0.55;
}

.refresh-button:not(:disabled):hover {
  background: rgba(14, 165, 233, 0.22);
}

.model-docs {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
  gap: 18px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  background:
    linear-gradient(135deg, rgba(14, 165, 233, 0.12), transparent 34%),
    rgba(22, 0, 32, 0.72);
}

.model-docs__intro h2 {
  margin: 0;
  color: #fff;
  font-size: 22px;
  font-weight: 900;
}

.model-docs__intro p {
  margin: 8px 0 0;
  color: #9ca3af;
  font-size: 13px;
  line-height: 1.5;
}

.model-docs__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.model-docs__grid div {
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.model-docs__grid strong {
  display: block;
  color: #f9fafb;
  font-size: 13px;
  font-weight: 900;
}

.model-docs__grid span {
  display: block;
  margin-top: 4px;
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.35;
}

.podium-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: end;
  min-height: 360px;
}

.podium-card {
  position: relative;
  order: 2;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 326px;
  padding: 22px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 14%, transparent), rgba(22, 0, 32, 0.86) 45%),
    rgba(22, 0, 32, 0.86);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.25);
}

.podium-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: var(--accent);
}

.podium-card.rank-1 {
  order: 2;
  min-height: 362px;
  transform: translateY(-18px);
  box-shadow: 0 24px 58px rgba(251, 191, 36, 0.18);
}

.podium-card.rank-2 {
  order: 1;
}

.podium-card.rank-3 {
  order: 3;
}

.podium-card.is-user-team,
.ranking-row.is-user-team {
  box-shadow: inset 0 0 0 1px rgba(168, 85, 247, 0.55), 0 18px 45px rgba(124, 58, 237, 0.16);
}

.podium-rank {
  position: absolute;
  top: 14px;
  left: 16px;
  color: var(--accent);
  font-size: 18px;
  font-weight: 900;
}

.podium-ring {
  display: grid;
  place-items: center;
  width: 132px;
  height: 132px;
  margin-top: 12px;
  border-radius: 999px;
  background: conic-gradient(var(--accent) var(--ring-progress), rgba(255, 255, 255, 0.09) 0);
  box-shadow: 0 0 30px color-mix(in srgb, var(--accent) 18%, transparent);
}

.rank-1 .podium-ring {
  width: 154px;
  height: 154px;
}

.podium-ring-inner {
  display: grid;
  place-items: center;
  width: calc(100% - 14px);
  height: calc(100% - 14px);
  border-radius: 999px;
  background: #12001c;
}

.podium-team {
  min-width: 0;
  margin-top: 18px;
  text-align: center;
}

.podium-team h2 {
  margin: 0;
  color: #fff;
  font-size: 24px;
  font-weight: 900;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.owner-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 7px;
  min-height: 30px;
  margin-top: 9px;
  padding: 4px 9px 4px 4px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.06);
  color: #d1d5db;
  font-size: 13px;
  font-weight: 700;
}

.owner-pill span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.owner-pill.is-empty {
  color: #6b7280;
}

.owner-avatar {
  width: 22px;
  height: 22px;
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
  font-size: 11px;
  font-weight: 900;
}

.podium-chance {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 16px;
}

.podium-chance strong {
  color: #fff;
  font-size: 34px;
  line-height: 1;
  font-weight: 900;
}

.podium-chance span {
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 700;
}

.path-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  margin-top: auto;
  padding-top: 18px;
}

.path-strip div {
  min-width: 0;
  padding: 9px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
  text-align: center;
}

.path-strip span,
.mini-stat span {
  display: block;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
}

.path-strip strong,
.mini-stat strong {
  display: block;
  margin-top: 2px;
  color: #f9fafb;
  font-size: 13px;
  font-weight: 800;
}

.ranking-panel {
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(124, 58, 237, 0.22);
  background: rgba(22, 0, 32, 0.72);
}

.ranking-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(124, 58, 237, 0.16);
}

.ranking-heading h2 {
  margin: 0;
  color: #fff;
  font-size: 22px;
  font-weight: 900;
}

.ranking-heading > span {
  flex-shrink: 0;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 700;
}

.ranking-list {
  display: flex;
  flex-direction: column;
}

.ranking-row {
  display: grid;
  grid-template-columns: 58px minmax(220px, 1.3fr) 72px 86px 80px minmax(210px, 1fr);
  gap: 14px;
  align-items: center;
  min-height: 74px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(124, 58, 237, 0.12);
}

.ranking-row:last-child {
  border-bottom: 0;
}

.rank-number {
  color: #c084fc;
  font-size: 15px;
  font-weight: 900;
}

.team-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.team-info {
  min-width: 0;
  flex: 1;
}

.team-name {
  color: #f9fafb;
  font-size: 15px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
  color: #6b7280;
  font-size: 12px;
}

.ranking-owner {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 128px;
  min-height: 30px;
  margin-left: auto;
  padding: 4px 9px 4px 4px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.055);
  color: #d1d5db;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.ranking-owner span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-owner.is-empty {
  color: #6b7280;
}

.ranking-owner__avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.ranking-owner__initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7C3AED, #A855F7);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.mini-stat {
  min-width: 0;
  padding: 7px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  text-align: center;
}

.delta-stat.is-positive strong {
  color: #86efac;
}

.delta-stat.is-negative strong {
  color: #fca5a5;
}

.chance-cell {
  min-width: 0;
}

.chance-topline {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 700;
}

.chance-topline span:first-child {
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}

.chance-bar {
  overflow: hidden;
  height: 9px;
  margin-top: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.chance-bar div {
  height: 100%;
  min-width: 2px;
  border-radius: inherit;
}

.empty-state {
  padding: 28px 18px;
  color: #9ca3af;
  font-size: 14px;
  text-align: center;
}

@media (max-width: 980px) {
  .leaderboard-head {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .status-card {
    width: fit-content;
    max-width: 100%;
    white-space: normal;
  }

  .podium-grid {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .model-docs {
    grid-template-columns: 1fr;
  }

  .model-docs__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .podium-card,
  .podium-card.rank-1,
  .podium-card.rank-2,
  .podium-card.rank-3 {
    order: initial;
    min-height: 0;
    transform: none;
  }

  .ranking-row {
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 10px 12px;
  }

  .mini-stat,
  .chance-cell {
    grid-column: 2;
  }

  .chance-cell {
    padding-bottom: 4px;
  }
}

@media (max-width: 640px) {
  header {
    align-items: flex-start;
  }

  header .nav-button {
    width: 38px;
    justify-content: center;
    padding: 8px;
    overflow: hidden;
    color: transparent;
    gap: 0;
  }

  header .nav-button svg {
    color: #d1d5db;
    flex-shrink: 0;
  }

  .page-title {
    font-size: 34px;
  }

  .podium-card {
    padding: 20px 16px;
  }

  .path-strip {
    grid-template-columns: 1fr;
  }

  .model-docs__grid {
    grid-template-columns: 1fr;
  }

  .team-cell {
    flex-wrap: wrap;
  }

  .ranking-owner {
    margin-left: 54px;
    max-width: calc(100% - 54px);
  }

  .ranking-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
