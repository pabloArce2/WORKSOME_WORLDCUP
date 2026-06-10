<template>
  <div class="relative min-h-screen flex flex-col overflow-hidden"
       style="background-color: #0D0014;">
    <div class="blob w-96 h-96 -top-20 -right-20" style="background: #6B21A8;"></div>
    <div class="blob w-96 h-96 bottom-0 -left-20" style="background: #4C1D95;"></div>
    <div class="grid-overlay absolute inset-0 pointer-events-none"></div>

    <div class="relative z-10 flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-6">

      <!-- Header: Worksome logo + sign out -->
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

      <!-- User banner -->
      <UserBanner />

      <!-- Tab bar -->
      <div class="flex gap-1 p-1 rounded-xl w-fit" style="background: rgba(22, 0, 32, 0.8); border: 1px solid rgba(124, 58, 237, 0.25);">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          :style="activeTab === tab.id
            ? 'background: linear-gradient(135deg, #7C3AED, #6D28D9); color: white; box-shadow: 0 0 15px rgba(124, 58, 237, 0.4);'
            : 'color: #9CA3AF;'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Live indicator -->
      <div class="flex items-center gap-2 -mt-4">
        <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
        <span class="text-xs" style="color: #6B7280;">Live — updates automatically</span>
      </div>

      <!-- Tab content -->
      <Transition name="fade" mode="out-in">
        <div v-if="activeTab === 'groups'" key="groups">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GroupTable
              v-for="group in groups"
              :key="group.id"
              :group="group"
              :userTeamId="store.team?.id ?? null"
              :players="players"
            />
          </div>
        </div>

        <div v-else-if="activeTab === 'bracket'" key="bracket">
          <div class="rounded-xl p-4" style="background: rgba(22, 0, 32, 0.6); border: 1px solid rgba(124, 58, 237, 0.2);">
            <BracketView :bracket="bracket" :userTeamId="store.team?.id ?? null" />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { onSnapshot, doc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase.js'
import { useUserStore } from '../stores/user.js'
import UserBanner from '../components/UserBanner.vue'
import GroupTable from '../components/GroupTable.vue'
import BracketView from '../components/BracketView.vue'
import WorksomeLogo from '../components/WorksomeLogo.vue'
import groupsData from '../assets/data/groups.json'

const store = useUserStore()
const router = useRouter()

const activeTab = ref('groups')
const tabs = [
  { id: 'groups',  label: 'Group Stage' },
  { id: 'bracket', label: 'Knockout Bracket' },
]

const groups  = groupsData.groups
const bracket = groupsData.bracket

// Real-time player → team map { teamId: { uid, displayName, photoURL } }
const players = ref({})

const unsubscribers = []

onMounted(() => {
  // Listen to player assignments (updates whenever someone spins)
  unsubscribers.push(
    onSnapshot(doc(db, 'config', 'players'), snap => {
      players.value = snap.exists() ? snap.data() : {}
    })
  )

  // Listen to current user's profile (win probability updates live)
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
})

async function signOut() {
  unsubscribers.forEach(unsub => unsub())
  await firebaseSignOut(auth)
  store.clearUser()
  router.push('/')
}
</script>
