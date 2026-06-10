<template>
  <div class="rounded-xl overflow-hidden" style="background: rgba(22, 0, 32, 0.7); border: 1px solid rgba(124, 58, 237, 0.25);">
    <div class="px-4 py-3 flex items-center gap-2" style="border-bottom: 1px solid rgba(124, 58, 237, 0.2);">
      <span class="text-2xl font-bold" style="color: #A855F7;">{{ group.id }}</span>
      <span class="text-white font-semibold">{{ group.name }}</span>
    </div>

    <table class="w-full text-sm">
      <thead>
        <tr style="color: #6B7280; border-bottom: 1px solid rgba(124, 58, 237, 0.15);">
          <th class="text-left px-4 py-2 font-medium">Team</th>
          <th class="text-left px-2 py-2 font-medium">Player</th>
          <th class="text-center px-2 py-2 font-medium w-8">W</th>
          <th class="text-center px-2 py-2 font-medium w-8">D</th>
          <th class="text-center px-2 py-2 font-medium w-8">L</th>
          <th class="text-center px-2 py-2 font-medium w-10">Pts</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="team in group.teams"
          :key="team.id"
          :class="team.id === userTeamId ? 'user-row' : ''"
          class="transition-all duration-200"
        >
          <td class="px-4 py-2.5">
            <div class="flex items-center gap-2">
              <span class="text-xl leading-none">{{ team.flag }}</span>
              <span :class="team.id === userTeamId ? 'text-white font-semibold' : 'text-gray-300'">
                {{ team.name }}
              </span>
              <span v-if="team.id === userTeamId"
                    class="text-xs px-1.5 py-0.5 rounded text-purple-200 font-medium"
                    style="background: rgba(124, 58, 237, 0.4);">you</span>
            </div>
          </td>

          <!-- Player avatar + name -->
          <td class="px-2 py-2.5">
            <div v-if="players[team.id]" class="flex items-center gap-1.5">
              <img v-if="players[team.id].photoURL"
                   :src="players[team.id].photoURL"
                   :alt="players[team.id].displayName"
                   class="w-6 h-6 rounded-full object-cover ring-1 ring-purple-500/50 flex-shrink-0" />
              <div v-else
                   class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                   style="background: linear-gradient(135deg, #7C3AED, #A855F7);">
                {{ players[team.id].displayName?.charAt(0) ?? '?' }}
              </div>
              <span class="text-xs text-gray-400 truncate max-w-20">
                {{ firstName(players[team.id].displayName) }}
              </span>
            </div>
            <span v-else class="text-xs text-gray-600">—</span>
          </td>

          <td class="text-center px-2 py-2.5 text-gray-300">{{ team.w }}</td>
          <td class="text-center px-2 py-2.5 text-gray-300">{{ team.d }}</td>
          <td class="text-center px-2 py-2.5 text-gray-300">{{ team.l }}</td>
          <td class="text-center px-2 py-2.5 font-bold"
              :style="team.id === userTeamId ? 'color: #A855F7;' : 'color: #E5E7EB;'">
            {{ team.pts }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  group:      { type: Object, required: true },
  userTeamId: { type: String, default: null },
  players:    { type: Object, default: () => ({}) },
})

function firstName(name) {
  return name?.split(' ')[0] ?? ''
}
</script>

<style scoped>
.user-row {
  background: rgba(124, 58, 237, 0.12);
  box-shadow: inset 0 0 0 1px rgba(168, 85, 247, 0.25);
}
</style>
