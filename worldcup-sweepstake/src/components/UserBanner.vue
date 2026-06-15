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

    <div v-if="store.team && !hideTeam" class="team-banner-team">
      <button
        v-if="showTeamStatsAction"
        class="team-mark-button"
        type="button"
        :aria-label="`Open ${store.team.name} stats`"
        @click="emit('openTeam', store.team)"
      >
        <TeamMark :team="store.team" :size="32" />
      </button>
      <TeamMark v-else :team="store.team" :size="32" />
      <div class="text-right">
        <p class="text-white font-medium text-sm">{{ store.team.name }}</p>
        <span v-if="displayProbability !== null"
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              style="background: linear-gradient(90deg, #7C3AED, #A855F7); color: white;">
          {{ formatProbability(displayProbability) }} now
          <span v-if="preTournamentProbability !== null"> / {{ formatProbability(preTournamentProbability) }} pre</span>
        </span>
      </div>
      <button
        v-if="showTeamStatsAction"
        class="team-stats-button"
        type="button"
        @click="emit('openTeam', store.team)"
      >
        Stats
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/user.js'
import TeamMark from './TeamMark.vue'

const props = defineProps({
  hideTeam: { type: Boolean, default: false },
  teamProbability: { type: Object, default: null },
  showTeamStatsAction: { type: Boolean, default: true },
})

const emit = defineEmits(['openTeam'])

const store = useUserStore()

const initials = computed(() => {
  const name = store.user?.displayName || store.user?.email || '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
})

const displayProbability = computed(() =>
  props.teamProbability?.championProbability ??
  store.team?.currentWinProbability ??
  store.profile?.winProbability ??
  null
)

const preTournamentProbability = computed(() =>
  props.teamProbability?.preTournamentProbability ?? null
)

function formatProbability(value) {
  return `${(Number(value) * 100).toFixed(1)}%`
}
</script>

<style scoped>
.team-banner-team {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 0;
}

.team-mark-button,
.team-stats-button {
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.team-mark-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  cursor: pointer;
}

.team-mark-button::after {
  content: "";
  position: absolute;
  inset: -5px;
  border-radius: 999px;
  border: 1px solid rgba(103, 232, 249, 0.55);
  background: rgba(14, 165, 233, 0.12);
  box-shadow: 0 0 18px rgba(103, 232, 249, 0.26);
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.team-mark-button:hover,
.team-mark-button:focus-visible {
  transform: translateY(-1px);
}

.team-mark-button:hover::after,
.team-mark-button:focus-visible::after {
  opacity: 1;
  transform: scale(1);
}

.team-mark-button > :deep(*) {
  position: relative;
  z-index: 1;
}

.team-stats-button {
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid rgba(103, 232, 249, 0.22);
  background: rgba(14, 165, 233, 0.12);
  color: #67e8f9;
  font-size: 12px;
  font-weight: 800;
}

.team-stats-button:hover {
  border-color: rgba(103, 232, 249, 0.42);
  background: rgba(14, 165, 233, 0.2);
}

@media (max-width: 640px) {
  .team-banner-team {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .team-stats-button {
    width: 100%;
  }
}
</style>
