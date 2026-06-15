<template>
  <div class="rounded-xl overflow-hidden" style="background: rgba(22, 0, 32, 0.7); border: 1px solid rgba(124, 58, 237, 0.25);">
    <div class="px-4 py-3 flex items-center gap-2" style="border-bottom: 1px solid rgba(124, 58, 237, 0.2);">
      <span class="text-2xl font-bold" style="color: #A855F7;">{{ group.id }}</span>
      <span class="text-white font-semibold">{{ group.name }}</span>
    </div>

    <div class="group-grid" role="table" :aria-label="group.name">
      <div class="group-row group-row--head" role="row">
        <div class="team-column" role="columnheader">Team</div>
        <div class="player-column" role="columnheader">Player</div>
        <div class="stat-cell" role="columnheader">P</div>
        <div class="stat-cell" role="columnheader">W</div>
        <div class="stat-cell" role="columnheader">D</div>
        <div class="stat-cell" role="columnheader">L</div>
        <div class="stat-cell" role="columnheader">GD</div>
        <div class="stat-cell" role="columnheader">Pts</div>
        <div class="win-cell" role="columnheader">Win</div>
      </div>

      <div
        v-for="team in group.teams"
        :key="team.id"
        :class="team.id === userTeamId ? 'user-row' : ''"
        class="group-row transition-all duration-200"
        role="row"
      >
        <div class="team-column team-cell" role="cell">
          <button
            class="team-shield-button"
            type="button"
            :aria-label="`Open ${team.name} stats`"
            @click="$emit('teamSelect', team)"
          >
            <TeamMark :team="team" :size="24" />
          </button>
          <span class="team-name" :class="team.id === userTeamId ? 'text-white font-semibold' : 'text-gray-300'">
            {{ team.name }}
          </span>
          <span v-if="team.id === userTeamId" class="you-pill">you</span>
        </div>

        <div class="player-column player-cell" role="cell">
          <template v-if="players[team.id]">
            <img v-if="players[team.id].photoURL"
                 :src="players[team.id].photoURL"
                 :alt="players[team.id].displayName"
                 class="player-avatar" />
            <div v-else class="player-avatar player-initials">
              {{ players[team.id].displayName?.charAt(0) ?? '?' }}
            </div>
            <span class="player-name">
              {{ firstName(players[team.id].displayName) }}
            </span>
          </template>
          <span v-else class="text-xs text-gray-600">-</span>
        </div>

        <div class="stat-cell" role="cell">{{ team.played ?? 0 }}</div>
        <div class="stat-cell" role="cell">{{ team.w }}</div>
        <div class="stat-cell" role="cell">{{ team.d }}</div>
        <div class="stat-cell" role="cell">{{ team.l }}</div>
        <div class="stat-cell" role="cell">{{ formatGoalDiff(team.gd) }}</div>
        <div class="stat-cell points-cell" role="cell">{{ team.pts }}</div>
        <div class="win-cell" role="cell">
          <span class="win-pill" :class="{ 'is-user': team.id === userTeamId }">
            {{ formatProbability(team.currentWinProbability) }}
          </span>
        </div>

        <div class="compact-stats" aria-hidden="true">
          <span><small>P</small>{{ team.played ?? 0 }}</span>
          <span><small>W</small>{{ team.w }}</span>
          <span><small>D</small>{{ team.d }}</span>
          <span><small>L</small>{{ team.l }}</span>
          <span><small>GD</small>{{ formatGoalDiff(team.gd) }}</span>
          <span><small>Pts</small>{{ team.pts }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import TeamMark from './TeamMark.vue'

defineProps({
  group: { type: Object, required: true },
  userTeamId: { type: String, default: null },
  players: { type: Object, default: () => ({}) },
})

defineEmits(['teamSelect'])

function firstName(name) {
  return name?.split(' ')[0] ?? ''
}

function formatGoalDiff(value) {
  const number = Number(value ?? 0)
  return number > 0 ? `+${number}` : String(number)
}

function formatProbability(value) {
  const number = Number(value ?? 0)
  if (number > 0 && number < 0.001) return '<0.1%'
  return `${(number * 100).toFixed(1)}%`
}
</script>

<style scoped>
.group-grid {
  width: 100%;
  overflow: hidden;
}

.group-row {
  display: grid;
  grid-template-columns: minmax(92px, 1.45fr) minmax(58px, 0.8fr) 22px 22px 22px 22px 32px 34px 52px;
  column-gap: 4px;
  align-items: center;
  min-height: 50px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(124, 58, 237, 0.12);
  font-size: 13px;
}

.group-row:last-child {
  border-bottom: 0;
}

.group-row--head {
  min-height: 44px;
  color: #6b7280;
  font-weight: 600;
  border-bottom-color: rgba(124, 58, 237, 0.15);
}

.team-column,
.player-column,
.stat-cell,
.win-cell {
  min-width: 0;
}

.team-cell,
.player-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}

.team-shield-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.team-shield-button::after {
  content: "";
  position: absolute;
  inset: -5px;
  border-radius: 999px;
  border: 1px solid rgba(103, 232, 249, 0.55);
  background: rgba(14, 165, 233, 0.12);
  box-shadow: 0 0 18px rgba(103, 232, 249, 0.24);
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.team-shield-button:hover,
.team-shield-button:focus-visible {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

.team-shield-button:hover::after,
.team-shield-button:focus-visible::after {
  opacity: 1;
  transform: scale(1);
}

.team-shield-button > :deep(*) {
  position: relative;
  z-index: 1;
}

.team-name {
  min-width: 0;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.you-pill {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(124, 58, 237, 0.4);
  color: #e9d5ff;
  font-size: 10px;
  font-weight: 700;
}

.player-avatar {
  width: 23px;
  height: 23px;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.55);
}

.player-initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7C3AED, #A855F7);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.player-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #9ca3af;
  font-size: 12px;
}

.stat-cell {
  text-align: center;
  color: #d1d5db;
}

.points-cell {
  color: #e5e7eb;
  font-weight: 800;
}

.win-cell {
  text-align: right;
}

.win-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  min-height: 24px;
  padding: 3px 5px;
  border-radius: 999px;
  background: rgba(124, 58, 237, 0.14);
  color: #c084fc;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.win-pill.is-user {
  background: rgba(168, 85, 247, 0.22);
  color: #f3e8ff;
}

.compact-stats {
  display: none;
}

.user-row {
  background: rgba(124, 58, 237, 0.12);
  box-shadow: inset 0 0 0 1px rgba(168, 85, 247, 0.25);
}

@media (max-width: 640px) {
  .group-row--head {
    display: none;
  }

  .group-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 7px 10px;
    min-height: 0;
    padding: 12px;
  }

  .team-column {
    grid-column: 1;
  }

  .player-column {
    grid-column: 1 / -1;
  }

  .win-cell {
    grid-column: 2;
    grid-row: 1;
  }

  .group-row > .stat-cell {
    display: none;
  }

  .compact-stats {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
  }

  .compact-stats span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 28px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.045);
    color: #e5e7eb;
    font-size: 12px;
    font-weight: 800;
  }

  .compact-stats small {
    color: #6b7280;
    font-size: 10px;
    font-weight: 700;
  }
}
</style>
