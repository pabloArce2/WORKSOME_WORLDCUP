<template>
  <div class="relative min-h-screen flex flex-col items-center gap-8 px-4 py-8 overflow-hidden"
       style="background-color: #0D0014;">
    <div class="blob w-96 h-96 -top-20 -left-20" style="background: #6B21A8;"></div>
    <div class="blob w-96 h-96 -bottom-20 -right-20" style="background: #6B21A8;"></div>
    <div class="grid-overlay absolute inset-0 pointer-events-none"></div>

    <div class="relative z-10 w-full max-w-lg flex flex-col items-center gap-8">
      <UserBanner :hideTeam="!revealDone" :show-team-stats-action="false" class="w-full" />

      <div class="text-center">
        <h2 class="text-2xl font-bold text-white">Your Team Awaits</h2>
        <p style="color: #C084FC;" class="text-sm mt-1">Spin the wheel to claim your World Cup team</p>
      </div>

      <div v-if="revealDone" class="flex flex-col items-center gap-6 w-full">
        <Transition name="pop" appear>
          <div class="rounded-2xl p-8 flex flex-col items-center gap-4 w-full text-center"
               style="background: rgba(22, 0, 32, 0.9); border: 1px solid rgba(168, 85, 247, 0.6); box-shadow: 0 0 40px rgba(168, 85, 247, 0.3);">
            <TeamMark v-if="revealedTeam" :team="revealedTeam" :size="96" />
            <h3 class="text-3xl font-bold text-white">{{ revealedTeam?.name }}</h3>
            <div class="flex gap-3 items-center flex-wrap justify-center">
              <span
                v-if="revealedTeam?.group"
                class="text-sm px-3 py-1 rounded-full font-medium"
                style="background: rgba(124, 58, 237, 0.3); color: #C084FC; border: 1px solid rgba(124, 58, 237, 0.4);"
              >
                Group {{ revealedTeam.group }}
              </span>
              <span v-if="winProbability !== null" class="text-sm px-3 py-1 rounded-full font-semibold text-white"
                    style="background: linear-gradient(90deg, #7C3AED, #A855F7);">
                {{ (winProbability * 100).toFixed(1) }}% win chance
              </span>
            </div>
          </div>
        </Transition>

        <Transition name="fade">
          <button v-if="showCta"
                  @click="$router.push('/dashboard')"
                  class="px-8 py-3 rounded-full font-semibold text-white text-base transition-all duration-200 hover:-translate-y-0.5"
                  style="background: linear-gradient(135deg, #7C3AED, #6D28D9); box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);">
            Go to my dashboard ->
          </button>
        </Transition>
      </div>

      <div v-else-if="assignedTeamId">
        <TeamReel :teamId="assignedTeamId" :teams="teams" @done="onReelDone" />
      </div>

      <div v-else class="flex flex-col items-center gap-4">
        <div v-if="loading" class="text-purple-300 text-sm animate-pulse">Drawing your team...</div>
        <div v-else-if="teamsLoading" class="text-purple-300 text-sm animate-pulse">Loading teams...</div>
        <div v-else-if="error" class="text-red-400 text-sm text-center max-w-xs">{{ error }}</div>
        <div v-else class="text-purple-300/60 text-sm">Ready to spin</div>

        <button
          @click="startAssignment"
          :disabled="loading || teamsLoading || !teams.length"
          class="relative px-12 py-4 rounded-full font-bold text-white text-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1"
          style="background: linear-gradient(135deg, #6D28D9, #7C3AED, #9333EA); box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);"
          @mouseover="e => e.currentTarget.style.boxShadow = '0 0 45px rgba(168, 85, 247, 0.7)'"
          @mouseleave="e => e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.5)'"
        >
          {{ loading ? '...' : 'SPIN' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase.js'
import { doc, runTransaction } from 'firebase/firestore'
import { useUserStore } from '../stores/user.js'
import UserBanner from '../components/UserBanner.vue'
import TeamReel from '../components/TeamReel.vue'
import TeamMark from '../components/TeamMark.vue'
import { getFallbackTeams, getTournamentTeams } from '../services/sportsDbApi.js'
import { fallbackPoolWinProbability } from '../services/probabilityModel.js'

const router = useRouter()
const store = useUserStore()

const loading = ref(false)
const teamsLoading = ref(false)
const error = ref('')
const teams = ref(getFallbackTeams())
const assignedTeamId = ref(null)
const revealDone = ref(false)
const showCta = ref(false)
const winProbability = ref(null)

let pendingProfile = null

const revealedTeam = computed(() =>
  assignedTeamId.value ? teams.value.find(t => t.id === assignedTeamId.value) : null
)

async function loadTeams() {
  teamsLoading.value = true

  try {
    const apiTeams = await getTournamentTeams()
    teams.value = apiTeams.length ? apiTeams : getFallbackTeams()
  } catch (e) {
    console.warn(e)
    teams.value = getFallbackTeams()
  } finally {
    teamsLoading.value = false
  }
}

async function startAssignment() {
  loading.value = true
  error.value = ''

  try {
    const user = auth.currentUser
    if (!user) throw new Error('Not authenticated')
    if (!teams.value.length) throw new Error('No teams available')

    const teamPool = teams.value.filter(team => team.id)
    let pickedTeamId = null
    let pickedTeam = null

    await runTransaction(db, async (tx) => {
      const assignmentsRef = doc(db, 'config', 'assignments')
      const assignmentsSnap = await tx.get(assignmentsRef)
      const taken = assignmentsSnap.exists() ? (assignmentsSnap.data().assigned ?? []) : []

      const teamIds = teamPool.map(team => team.id)
      const remaining = teamIds.filter(id => !taken.includes(id))
      const pool = remaining.length > 0 ? remaining : teamIds

      pickedTeamId = pool[Math.floor(Math.random() * pool.length)]
      pickedTeam = teamPool.find(team => team.id === pickedTeamId)
      const profileTeam = serializeTeam(pickedTeam)
      const prob = pickedTeam?.currentWinProbability ??
        pickedTeam?.preTournamentWinProbability ??
        fallbackPoolWinProbability(pickedTeamId, teamIds, teamPool)

      tx.set(doc(db, 'users', user.uid), {
        teamId: pickedTeamId,
        team: profileTeam,
        assignedAt: new Date().toISOString(),
        winProbability: prob,
      }, { merge: true })

      tx.set(assignmentsRef, {
        assigned: [...new Set([...taken, pickedTeamId])],
      })

      tx.set(doc(db, 'config', 'players'), {
        [pickedTeamId]: {
          uid: user.uid,
          displayName: user.displayName ?? '',
          photoURL: user.photoURL ?? '',
        },
      }, { merge: true })

      winProbability.value = prob
      pendingProfile = {
        ...store.profile,
        teamId: pickedTeamId,
        team: profileTeam,
        winProbability: prob,
      }
    })

    assignedTeamId.value = pickedTeamId
  } catch (e) {
    console.error(e)
    error.value = 'Could not assign a team. Check Firestore rules and try again.'
  } finally {
    loading.value = false
  }
}

function onReelDone() {
  if (pendingProfile) {
    store.setProfile(pendingProfile)
    pendingProfile = null
  }
  revealDone.value = true
  setTimeout(() => { showCta.value = true }, 2000)
}

function serializeTeam(team) {
  if (!team) return null

  return {
    id: team.id,
    apiId: team.apiId ?? null,
    name: team.name,
    flag: team.flag ?? '',
    logo: team.logo ?? '',
    group: team.group ?? null,
    color: team.color ?? null,
    preOdds: team.preOdds ?? 0,
    currentWinProbability: team.currentWinProbability ?? null,
    preTournamentWinProbability: team.preTournamentWinProbability ?? null,
    groupAdvanceProbability: team.groupAdvanceProbability ?? null,
    liveRating: team.liveRating ?? null,
    baseRating: team.baseRating ?? null,
  }
}

onMounted(() => {
  loadTeams()
  if (store.profile?.teamId) router.push('/dashboard')
})
</script>

<style scoped>
.pop-enter-active { animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes popIn {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
</style>
