<template>
  <div class="flex items-center gap-4 px-5 py-3 rounded-xl"
       style="background: rgba(109, 40, 217, 0.15); border: 1px solid rgba(109, 40, 217, 0.4);">

    <div class="relative flex-shrink-0">
      <img v-if="store.user?.photoURL"
           :src="store.user.photoURL"
           :alt="store.user.displayName"
           class="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500" />
      <div v-else
           class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
           style="background: linear-gradient(135deg, #7C3AED, #A855F7);">
        {{ initials }}
      </div>
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-white font-semibold text-sm truncate">{{ store.user?.displayName }}</p>
      <p class="text-xs truncate" style="color: #9CA3AF;">{{ store.user?.email }}</p>
    </div>

    <div v-if="store.team && !hideTeam" class="flex items-center gap-2 flex-shrink-0">
      <TeamMark :team="store.team" :size="32" />
      <div class="text-right">
        <p class="text-white font-medium text-sm">{{ store.team.name }}</p>
        <span v-if="store.profile?.winProbability"
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              style="background: linear-gradient(90deg, #7C3AED, #A855F7); color: white;">
          {{ (store.profile.winProbability * 100).toFixed(1) }}% chance
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/user.js'
import TeamMark from './TeamMark.vue'

defineProps({
  hideTeam: { type: Boolean, default: false },
})

const store = useUserStore()

const initials = computed(() => {
  const name = store.user?.displayName || store.user?.email || '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
})
</script>
