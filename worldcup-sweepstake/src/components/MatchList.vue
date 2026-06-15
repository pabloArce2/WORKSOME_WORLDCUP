<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
    <article
      v-for="match in visibleMatches"
      :key="match.id"
      class="rounded-xl p-4"
      style="background: rgba(22, 0, 32, 0.7); border: 1px solid rgba(124, 58, 237, 0.25);"
    >
      <div class="flex items-center justify-between gap-3 text-xs" style="color: #9CA3AF;">
        <span>{{ formatKickoff(match.kickoff) }}</span>
        <span
          class="px-2 py-0.5 rounded-full font-medium"
          :style="statusStyle(match)"
        >
          {{ formatStatus(match) }}
        </span>
      </div>

      <div class="mt-3 flex flex-col gap-2">
        <div class="flex items-center justify-between gap-3">
          <TeamIdentity :team="match.home" @team-select="emit('teamSelect', $event)" />
          <div class="flex items-center gap-3 min-w-0 justify-end">
            <span v-if="playerFor(match.home)" class="text-xs text-gray-400 truncate max-w-[120px]">
              {{ ownerLabel(playerFor(match.home)) }}
            </span>
            <span v-if="hasScore(match.homeScore)" class="text-white font-bold">{{ match.homeScore }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3">
          <TeamIdentity :team="match.away" @team-select="emit('teamSelect', $event)" />
          <div class="flex items-center gap-3 min-w-0 justify-end">
            <span v-if="playerFor(match.away)" class="text-xs text-gray-400 truncate max-w-[120px]">
              {{ ownerLabel(playerFor(match.away)) }}
            </span>
            <span v-if="hasScore(match.awayScore)" class="text-white font-bold">{{ match.awayScore }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="hasAnyPlayer(match)"
        class="mt-4 flex items-center gap-2 rounded-lg px-3 py-2"
        style="background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.2);"
      >
        <PlayerPill :player="playerFor(match.home)" :team="match.home" />
        <span class="text-xs font-semibold flex-shrink-0" style="color: #A855F7;">vs</span>
        <PlayerPill :player="playerFor(match.away)" :team="match.away" align="right" />
      </div>

      <div
        v-if="match.venue || match.round || match.group"
        class="mt-3 flex items-center justify-between gap-3 text-xs"
        style="color: #6B7280;"
      >
        <span class="truncate">{{ match.venue }}</span>
        <span class="truncate text-right">{{ match.group ? `Group ${match.group}` : match.round }}</span>
      </div>
    </article>

    <div
      v-if="!visibleMatches.length"
      class="rounded-xl p-6 text-center text-sm"
      style="background: rgba(22, 0, 32, 0.7); border: 1px solid rgba(124, 58, 237, 0.25); color: #9CA3AF;"
    >
      No matches available yet.
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h } from 'vue'
import TeamMark from './TeamMark.vue'

const props = defineProps({
  matches: { type: Array, default: () => [] },
  players: { type: Object, default: () => ({}) },
  limit: { type: Number, default: 16 },
})

const emit = defineEmits(['teamSelect'])

const visibleMatches = computed(() => props.matches.slice(0, props.limit))

function hasScore(value) {
  return value !== null && value !== undefined
}

function playerFor(team) {
  return team?.id ? props.players[team.id] : null
}

function hasAnyPlayer(match) {
  return Boolean(playerFor(match.home) || playerFor(match.away))
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

function formatStatus(match) {
  const status = String(match.status || '').toUpperCase()

  if (status === 'FT') return 'Final'
  if (status === 'NS') return 'Upcoming'
  if (status === 'HT') return 'Half-time'
  if (status === '1H' || status === '2H' || status === 'LIVE') return 'Live'
  if (status === 'POST') return 'Postponed'
  return match.round || 'Scheduled'
}

function statusStyle(match) {
  const status = String(match.status || '').toUpperCase()
  const isLive = status === 'HT' || status === '1H' || status === '2H' || status === 'LIVE'
  const isFinal = status === 'FT'

  if (isLive) return 'background: rgba(34, 197, 94, 0.16); color: #86EFAC;'
  if (isFinal) return 'background: rgba(107, 114, 128, 0.18); color: #D1D5DB;'
  return 'background: rgba(124, 58, 237, 0.18); color: #C084FC;'
}

const TeamIdentity = defineComponent({
  props: {
    team: { type: Object, default: null },
  },
  emits: ['teamSelect'],
  setup(componentProps, { emit: componentEmit }) {
    return () => h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: 0,
        flex: 1,
      }
    }, [
      h('button', {
        type: 'button',
        class: 'match-team-shield',
        'aria-label': `Open ${componentProps.team?.name || 'team'} stats`,
        onClick: () => {
          if (componentProps.team?.id) componentEmit('teamSelect', componentProps.team)
        },
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderRadius: '999px',
        },
      }, [h(TeamMark, { team: componentProps.team, size: 24 })]),
      h('span', {
        style: {
          color: '#E5E7EB',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }
      }, componentProps.team?.name || 'TBD'),
    ])
  }
})

const PlayerPill = defineComponent({
  props: {
    player: { type: Object, default: null },
    team: { type: Object, default: null },
    align: { type: String, default: 'left' },
  },
  setup(componentProps) {
    return () => {
      const name = firstName(componentProps.player?.displayName) || 'Unclaimed'
      const initials = name.charAt(0).toUpperCase() || '?'
      const avatar = componentProps.player?.photoURL
        ? h('img', {
            src: componentProps.player.photoURL,
            alt: componentProps.player.displayName,
            style: {
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              objectFit: 'cover',
              flexShrink: 0,
            }
          })
        : h('span', {
            style: {
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              flexShrink: 0,
            }
          }, initials)

      const label = h('span', {
        style: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: componentProps.player ? '#F3F4F6' : '#6B7280',
          fontSize: '12px',
        }
      }, `${name} (${componentProps.team?.name || 'TBD'})`)

      const children = componentProps.align === 'right' ? [label, avatar] : [avatar, label]

      return h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: componentProps.align === 'right' ? 'flex-end' : 'flex-start',
          gap: '7px',
          minWidth: 0,
          flex: 1,
        }
      }, children)
    }
  }
})

function ownerLabel(player) {
  if (!player) return ''
  return firstName(player.displayName) || player.displayName || 'Owner'
}

function firstName(name) {
  return name?.split(' ')[0] ?? ''
}
</script>

<style scoped>
.match-team-shield {
  position: relative;
  cursor: pointer;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.match-team-shield::after {
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

.match-team-shield:hover,
.match-team-shield:focus-visible {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

.match-team-shield:hover::after,
.match-team-shield:focus-visible::after {
  opacity: 1;
  transform: scale(1);
}

.match-team-shield > :deep(*) {
  position: relative;
  z-index: 1;
}
</style>
