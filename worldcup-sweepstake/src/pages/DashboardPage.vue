<template>
  <div class="relative min-h-screen flex flex-col overflow-hidden"
       style="background-color: #0D0014;">
    <div class="blob w-96 h-96 -top-20 -right-20" style="background: #6B21A8;"></div>
    <div class="blob w-96 h-96 bottom-0 -left-20" style="background: #4C1D95;"></div>
    <div class="grid-overlay absolute inset-0 pointer-events-none"></div>

    <div class="relative z-10 flex flex-col flex-1 max-w-7xl mx-auto w-full px-4 py-6 gap-6">
      <div class="flex items-center justify-between">
        <WorksomeLogo />
        <button
          @click="signOut"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style="background: rgba(22, 0, 32, 0.8); border: 1px solid rgba(124, 58, 237, 0.25); color: #9CA3AF;"
          @mouseover="e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)' }"
          @mouseleave="e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)' }"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>

      <UserBanner :team-probability="userTeamProbability" @open-team="openTeamDetails" />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style="background: rgba(22, 0, 32, 0.8); border: 1px solid rgba(124, 58, 237, 0.25);">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            :style="activeTab === tab.id
              ? 'background: linear-gradient(135deg, #7C3AED, #6D28D9); color: white; box-shadow: 0 0 15px rgba(124, 58, 237, 0.4);'
              : 'color: #9CA3AF;'"
          >
            {{ tab.label }}
          </button>
        </div>

        <button
          @click="router.push('/rankings')"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
          style="background: rgba(14, 165, 233, 0.14); border: 1px solid rgba(103, 232, 249, 0.28); color: #67E8F9;"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/>
            <path d="m19 9-5 5-4-4-3 3"/>
          </svg>
          Rankings
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3 -mt-4">
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="loadingData ? 'bg-yellow-300 animate-pulse' : dataSource === 'fallback' ? 'bg-purple-400' : 'bg-green-400 animate-pulse'"
          ></span>
          <span class="text-xs" style="color: #6B7280;">{{ dataStatusLabel }}</span>
        </div>
        <button
          @click="refreshTournamentData"
          :disabled="loadingData"
          class="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 disabled:opacity-50"
          style="background: rgba(22, 0, 32, 0.8); border: 1px solid rgba(124, 58, 237, 0.25); color: #C084FC;"
        >
          Refresh
        </button>
      </div>

      <div
        v-if="dataError"
        class="rounded-lg px-4 py-3 text-sm"
        style="background: rgba(127, 29, 29, 0.24); border: 1px solid rgba(248, 113, 113, 0.35); color: #FCA5A5;"
      >
        {{ dataError }}
      </div>

      <Transition name="fade" mode="out-in">
        <div v-if="activeTab === 'groups'" key="groups">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <GroupTable
              v-for="group in groups"
              :key="group.id"
              :group="group"
              :userTeamId="store.team?.id ?? null"
              :players="players"
              @team-select="openTeamDetails"
            />
          </div>
        </div>

        <div v-else-if="activeTab === 'matches'" key="matches">
          <MatchList :matches="matches" :players="players" @team-select="openTeamDetails" />
        </div>

        <div v-else-if="activeTab === 'bracket'" key="bracket">
          <div class="rounded-xl p-4" style="background: rgba(22, 0, 32, 0.6); border: 1px solid rgba(124, 58, 237, 0.2);">
            <BracketView :bracket="bracket" :userTeamId="store.team?.id ?? null" />
          </div>
        </div>

        <div v-else-if="activeTab === 'stats'" key="stats">
          <StatsPanel :goalscorers="goalscorers" :cards="cards" :groups="groups" :matches="matches" />
        </div>
      </Transition>

      <TeamDetailsModal
        v-if="selectedTeam"
        :team="selectedTeam"
        :player="selectedPlayer"
        :matches="matches"
        :rank-movement="selectedRankMovement"
        @close="selectedTeamId = null"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { onSnapshot, doc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase.js'
import { useUserStore } from '../stores/user.js'
import UserBanner from '../components/UserBanner.vue'
import GroupTable from '../components/GroupTable.vue'
import BracketView from '../components/BracketView.vue'
import MatchList from '../components/MatchList.vue'
import StatsPanel from '../components/StatsPanel.vue'
import TeamDetailsModal from '../components/TeamDetailsModal.vue'
import WorksomeLogo from '../components/WorksomeLogo.vue'
import { getFallbackBracket, getFallbackGroups, getTournamentSnapshot } from '../services/sportsDbApi.js'

const store = useUserStore()
const router = useRouter()

const activeTab = ref('groups')
const tabs = [
  { id: 'groups',  label: 'Group Stage' },
  { id: 'matches', label: 'Matches' },
  { id: 'bracket', label: 'Knockout Bracket' },
  { id: 'stats',   label: 'Stats' },
]

const groups = ref(getFallbackGroups())
const bracket = ref(getFallbackBracket())
const matches = ref([])
const goalscorers = ref([])
const cards = ref([])
const probabilities = ref({})
const dataSource = ref('fallback')
const dataError = ref('')
const loadingData = ref(false)
const lastUpdatedAt = ref(null)
const players = ref({})
const selectedTeamId = ref(null)

const unsubscribers = []
let refreshTimer = null

const dataStatusLabel = computed(() => {
  if (loadingData.value) return 'Updating TheSportsDB data...'
  if (dataSource.value === 'api') return `TheSportsDB data ${formatUpdatedAt(lastUpdatedAt.value)}`
  if (dataSource.value === 'partial') return `Partial TheSportsDB data ${formatUpdatedAt(lastUpdatedAt.value)}`
  return 'Using local fallback data'
})

const userTeamProbability = computed(() => {
  const teamId = store.team?.id
  return teamId ? probabilities.value[teamId] ?? null : null
})

const allTeams = computed(() =>
  groups.value.flatMap(group => group.teams.map(team => {
    const probability = probabilities.value[team.id] ?? team.probability ?? {}

    return {
      ...team,
      group: team.group || group.id,
      currentWinProbability: probability.championProbability ?? team.currentWinProbability ?? 0,
      preTournamentWinProbability: probability.preTournamentProbability ?? team.preTournamentWinProbability ?? 0,
      groupAdvanceProbability: probability.groupAdvanceProbability ?? team.groupAdvanceProbability ?? 0,
      finalProbability: probability.finalProbability ?? team.finalProbability ?? 0,
      liveRating: probability.liveRating ?? team.liveRating ?? team.baseRating ?? 1600,
      baseRating: probability.baseRating ?? team.baseRating ?? 1600,
      formRatingDelta: probability.formRatingDelta ?? team.formRatingDelta ?? 0,
    }
  }))
)

const teamsById = computed(() =>
  new Map(allTeams.value.map(team => [team.id, team]))
)

const rankingTeams = computed(() =>
  allTeams.value.map(team => {
    const probability = probabilities.value[team.id] ?? team.probability ?? {}

    return {
      ...team,
      currentWinProbability: probability.championProbability ?? team.currentWinProbability ?? 0,
      preTournamentWinProbability: probability.preTournamentProbability ?? team.preTournamentWinProbability ?? 0,
      liveRating: probability.liveRating ?? team.liveRating ?? team.baseRating ?? 1600,
    }
  })
)

const rankMovementsById = computed(() => {
  const currentRanks = rankMap(rankingTeams.value, 'currentWinProbability')
  const preRanks = rankMap(rankingTeams.value, 'preTournamentWinProbability')

  return Object.fromEntries(rankingTeams.value.map(team => {
    const currentRank = currentRanks[team.id]
    const preRank = preRanks[team.id]
    return [team.id, {
      currentRank,
      preRank,
      delta: preRank - currentRank,
    }]
  }))
})

const selectedTeam = computed(() =>
  selectedTeamId.value ? teamsById.value.get(selectedTeamId.value) ?? null : null
)

const selectedPlayer = computed(() =>
  selectedTeam.value?.id ? players.value[selectedTeam.value.id] ?? null : null
)

const selectedRankMovement = computed(() =>
  selectedTeam.value?.id ? rankMovementsById.value[selectedTeam.value.id] ?? null : null
)

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
    const snapshot = await getTournamentSnapshot()
    groups.value = snapshot.groups
    bracket.value = snapshot.bracket
    matches.value = snapshot.matches
    probabilities.value = snapshot.probabilities ?? {}
    goalscorers.value = snapshot.goalscorers
    cards.value = snapshot.cards
    dataSource.value = snapshot.source
    dataError.value = snapshot.error
    lastUpdatedAt.value = snapshot.updatedAt
  } catch (error) {
    dataSource.value = 'fallback'
    dataError.value = error?.message || 'Could not load World Cup API data.'
    console.warn(error)
  } finally {
    loadingData.value = false
  }
}

async function signOut() {
  unsubscribers.forEach(unsub => unsub())
  if (refreshTimer) window.clearInterval(refreshTimer)
  selectedTeamId.value = null
  await firebaseSignOut(auth)
  store.clearUser()
  router.push('/')
}

function openTeamDetails(team) {
  if (!team?.id) return
  selectedTeamId.value = team.id
}

function rankMap(teams, probabilityKey) {
  return Object.fromEntries(
    [...teams]
      .sort((a, b) =>
        Number(b[probabilityKey] || 0) - Number(a[probabilityKey] || 0) ||
        Number(b.liveRating || 0) - Number(a.liveRating || 0) ||
        String(a.name).localeCompare(String(b.name))
      )
      .map((team, index) => [team.id, index + 1])
  )
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
