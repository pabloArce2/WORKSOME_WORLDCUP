<template>
  <div class="relative min-h-screen flex flex-col items-center gap-8 px-4 py-8 overflow-hidden"
       style="background-color: #0D0014;">
    <div class="blob w-96 h-96 -top-20 -left-20" style="background: #6B21A8;"></div>
    <div class="blob w-96 h-96 -bottom-20 -right-20" style="background: #6B21A8;"></div>
    <div class="grid-overlay absolute inset-0 pointer-events-none"></div>

    <div class="relative z-10 w-full max-w-lg flex flex-col items-center gap-8">
      <!-- Banner only shows name/email — team is hidden until after the spin -->
      <UserBanner :hideTeam="!revealDone" class="w-full" />

      <div class="text-center">
        <h2 class="text-2xl font-bold text-white">Your Team Awaits</h2>
        <p style="color: #C084FC;" class="text-sm mt-1">Spin the wheel to claim your World Cup team</p>
      </div>

      <!-- Post-reveal card -->
      <div v-if="revealDone" class="flex flex-col items-center gap-6 w-full">
        <Transition name="pop" appear>
          <div class="rounded-2xl p-8 flex flex-col items-center gap-4 w-full text-center"
               style="background: rgba(22, 0, 32, 0.9); border: 1px solid rgba(168, 85, 247, 0.6); box-shadow: 0 0 40px rgba(168, 85, 247, 0.3);">
            <span class="text-7xl">{{ revealedTeam?.flag }}</span>
            <h3 class="text-3xl font-bold text-white">{{ revealedTeam?.name }}</h3>
            <div class="flex gap-3 items-center flex-wrap justify-center">
              <span class="text-sm px-3 py-1 rounded-full font-medium"
                    style="background: rgba(124, 58, 237, 0.3); color: #C084FC; border: 1px solid rgba(124, 58, 237, 0.4);">
                Group {{ revealedTeam?.group }}
              </span>
              <span v-if="winProbability" class="text-sm px-3 py-1 rounded-full font-semibold text-white"
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
            Go to my dashboard →
          </button>
        </Transition>
      </div>

      <!-- Reel animation -->
      <div v-else-if="assignedTeamId">
        <TeamReel :teamId="assignedTeamId" @done="onReelDone" />
      </div>

      <!-- Spin button -->
      <div v-else class="flex flex-col items-center gap-4">
        <div v-if="loading" class="text-purple-300 text-sm animate-pulse">Drawing your team…</div>
        <div v-else-if="error" class="text-red-400 text-sm text-center max-w-xs">{{ error }}</div>
        <div v-else class="text-purple-300/60 text-sm">Ready to spin</div>

        <button
          @click="startAssignment"
          :disabled="loading"
          class="relative px-12 py-4 rounded-full font-bold text-white text-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1"
          style="background: linear-gradient(135deg, #6D28D9, #7C3AED, #9333EA); box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);"
          @mouseover="e => e.currentTarget.style.boxShadow = '0 0 45px rgba(168, 85, 247, 0.7)'"
          @mouseleave="e => e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.5)'"
        >
          {{ loading ? '…' : 'SPIN' }}
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
import teamsData from '../assets/data/teams.json'

const router = useRouter()
const store = useUserStore()

const loading   = ref(false)
const error     = ref('')
const assignedTeamId = ref(null)
const revealDone = ref(false)
const showCta   = ref(false)
const winProbability = ref(null)

// Pending profile — applied to store only after the reel finishes
let pendingProfile = null

const revealedTeam = computed(() =>
  assignedTeamId.value ? teamsData.find(t => t.id === assignedTeamId.value) : null
)

function calcWinProbability(teamId, pool) {
  const totalOdds = pool.reduce((s, id) => {
    const t = teamsData.find(t => t.id === id)
    return s + (t?.preOdds ?? 0)
  }, 0)
  const teamOdds = teamsData.find(t => t.id === teamId)?.preOdds ?? 0
  return totalOdds > 0 ? teamOdds / totalOdds : 0
}

async function startAssignment() {
  loading.value = true
  error.value = ''
  try {
    const user = auth.currentUser
    if (!user) throw new Error('Not authenticated')

    let pickedTeamId = null

    await runTransaction(db, async (tx) => {
      const assignmentsRef = doc(db, 'config', 'assignments')
      const assignmentsSnap = await tx.get(assignmentsRef)
      const taken = assignmentsSnap.exists() ? (assignmentsSnap.data().assigned ?? []) : []

      const remaining = teamsData.map(t => t.id).filter(id => !taken.includes(id))
      // If all teams taken, start a new round
      const pool = remaining.length > 0 ? remaining : teamsData.map(t => t.id)

      pickedTeamId = pool[Math.floor(Math.random() * pool.length)]
      const prob = calcWinProbability(pickedTeamId, teamsData.map(t => t.id))

      tx.set(doc(db, 'users', user.uid), {
        teamId: pickedTeamId,
        assignedAt: new Date().toISOString(),
        winProbability: prob,
      }, { merge: true })

      tx.set(assignmentsRef, {
        assigned: [...new Set([...taken, pickedTeamId])],
      })

      // Record which player has this team (for the dashboard photos)
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
        winProbability: prob,
      }
    })

    assignedTeamId.value = pickedTeamId
  } catch (e) {
    console.error(e)
    error.value = 'Could not assign a team — check your Firestore rules and try again.'
  } finally {
    loading.value = false
  }
}

function onReelDone() {
  // Only now reveal the team in the banner and show the card
  if (pendingProfile) {
    store.setProfile(pendingProfile)
    pendingProfile = null
  }
  revealDone.value = true
  setTimeout(() => { showCta.value = true }, 2000)
}

onMounted(() => {
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
