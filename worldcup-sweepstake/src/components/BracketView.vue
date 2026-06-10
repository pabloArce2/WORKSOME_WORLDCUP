<template>
  <div class="overflow-x-auto pb-4">
    <div class="flex gap-4 items-stretch min-w-max px-2 py-4">

      <!-- Round of 16 -->
      <div class="flex flex-col justify-around gap-3" style="min-width: 160px;">
        <div class="text-xs font-semibold text-center mb-1" style="color: #A855F7;">Round of 16</div>
        <BracketSlot
          v-for="match in bracket.r16"
          :key="match.id"
          :home="getTeam(match.home)"
          :away="getTeam(match.away)"
          :userTeamId="userTeamId"
        />
      </div>

      <!-- Connector -->
      <div class="flex items-center">
        <BracketConnector :pairs="4" />
      </div>

      <!-- Quarter-finals -->
      <div class="flex flex-col justify-around gap-3" style="min-width: 160px;">
        <div class="text-xs font-semibold text-center mb-1" style="color: #A855F7;">Quarter-finals</div>
        <BracketSlot
          v-for="match in bracket.qf"
          :key="match.id"
          :home="getTeam(match.home)"
          :away="getTeam(match.away)"
          :userTeamId="userTeamId"
        />
      </div>

      <!-- Connector -->
      <div class="flex items-center">
        <BracketConnector :pairs="2" />
      </div>

      <!-- Semi-finals -->
      <div class="flex flex-col justify-around gap-3" style="min-width: 160px;">
        <div class="text-xs font-semibold text-center mb-1" style="color: #A855F7;">Semi-finals</div>
        <BracketSlot
          v-for="match in bracket.sf"
          :key="match.id"
          :home="getTeam(match.home)"
          :away="getTeam(match.away)"
          :userTeamId="userTeamId"
        />
      </div>

      <!-- Connector -->
      <div class="flex items-center">
        <BracketConnector :pairs="1" />
      </div>

      <!-- Final -->
      <div class="flex flex-col justify-center gap-3" style="min-width: 160px;">
        <div class="text-xs font-semibold text-center mb-1" style="color: #A855F7;">Final</div>
        <BracketSlot
          v-for="match in bracket.final"
          :key="match.id"
          :home="getTeam(match.home)"
          :away="getTeam(match.away)"
          :userTeamId="userTeamId"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { defineComponent, h } from 'vue'
import teams from '../assets/data/teams.json'

const props = defineProps({
  bracket: { type: Object, required: true },
  userTeamId: { type: String, default: null },
})

function getTeam(id) {
  if (!id) return null
  return teams.find(t => t.id === id) ?? null
}

// Inline BracketSlot component
const BracketSlot = defineComponent({
  props: {
    home: { type: Object, default: null },
    away: { type: Object, default: null },
    userTeamId: { type: String, default: null },
  },
  setup(p) {
    return () => {
      const isUserHome = p.home?.id === p.userTeamId
      const isUserAway = p.away?.id === p.userTeamId
      const hasUser = isUserHome || isUserAway

      const slotStyle = {
        background: 'rgba(22, 0, 32, 0.8)',
        border: hasUser
          ? '1px solid rgba(168, 85, 247, 0.7)'
          : '1px solid rgba(124, 58, 237, 0.25)',
        boxShadow: hasUser ? '0 0 12px rgba(168, 85, 247, 0.35)' : 'none',
        borderRadius: '10px',
        overflow: 'hidden',
        fontSize: '13px',
      }

      const teamRow = (team, isUser) => h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          background: isUser ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
          borderBottom: '1px solid rgba(124, 58, 237, 0.1)',
          color: isUser ? 'white' : '#D1D5DB',
          fontWeight: isUser ? '600' : '400',
        }
      }, [
        h('span', { style: { fontSize: '16px', lineHeight: 1 } }, team?.flag ?? ''),
        h('span', { style: { flex: 1 } }, team?.name ?? 'TBD'),
      ])

      return h('div', { style: slotStyle }, [
        teamRow(p.home, isUserHome),
        teamRow(p.away, isUserAway),
      ])
    }
  }
})

// Inline BracketConnector — draws vertical lines connecting pairs
const BracketConnector = defineComponent({
  props: { pairs: { type: Number, required: true } },
  setup(p) {
    return () => h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        height: '100%',
        width: '20px',
        gap: '12px',
      }
    }, Array.from({ length: p.pairs }, (_, i) =>
      h('div', {
        key: i,
        style: {
          flex: 1,
          borderRight: '1px solid rgba(124, 58, 237, 0.3)',
          borderTop: '1px solid rgba(124, 58, 237, 0.3)',
          borderBottom: '1px solid rgba(124, 58, 237, 0.3)',
          borderTopRightRadius: '4px',
          borderBottomRightRadius: '4px',
        }
      })
    ))
  }
})
</script>
