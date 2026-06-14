<template>
  <div class="overflow-x-auto pb-4">
    <div class="flex gap-4 items-stretch min-w-max px-2 py-4">
      <BracketRound title="Round of 32" :matches="bracket.r32" :user-team-id="userTeamId" />
      <div class="flex items-center"><BracketConnector :pairs="8" /></div>

      <BracketRound title="Round of 16" :matches="bracket.r16" :user-team-id="userTeamId" />
      <div class="flex items-center"><BracketConnector :pairs="4" /></div>

      <BracketRound title="Quarter-finals" :matches="bracket.qf" :user-team-id="userTeamId" />
      <div class="flex items-center"><BracketConnector :pairs="2" /></div>

      <BracketRound title="Semi-finals" :matches="bracket.sf" :user-team-id="userTeamId" />
      <div class="flex items-center"><BracketConnector :pairs="1" /></div>

      <BracketRound title="Final" :matches="bracket.final" :user-team-id="userTeamId" centered />
    </div>
  </div>
</template>

<script setup>
import { defineComponent, h } from 'vue'
import teams from '../assets/data/teams.json'
import TeamMark from './TeamMark.vue'
import { enrichTeam } from '../assets/data/teamMeta.js'

defineProps({
  bracket: { type: Object, required: true },
  userTeamId: { type: String, default: null },
})

function getTeam(id) {
  if (!id) return null
  if (typeof id === 'object') return enrichTeam(id)
  return enrichTeam(teams.find(team => team.id === id)) ?? null
}

const BracketRound = defineComponent({
  props: {
    title: { type: String, required: true },
    matches: { type: Array, default: () => [] },
    userTeamId: { type: String, default: null },
    centered: { type: Boolean, default: false },
  },
  setup(props) {
    return () => h('div', {
      style: {
        minWidth: '176px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: props.centered ? 'center' : 'space-around',
        gap: '12px',
      }
    }, [
      h('div', {
        style: {
          color: '#A855F7',
          fontSize: '12px',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: '4px',
        }
      }, props.title),
      ...props.matches.map(match => h(BracketSlot, {
        key: match.id,
        match,
        home: getTeam(match.home),
        away: getTeam(match.away),
        userTeamId: props.userTeamId,
      })),
    ])
  }
})

const BracketSlot = defineComponent({
  props: {
    match: { type: Object, default: null },
    home: { type: Object, default: null },
    away: { type: Object, default: null },
    userTeamId: { type: String, default: null },
  },
  setup(props) {
    return () => {
      const isUserHome = props.home?.id === props.userTeamId
      const isUserAway = props.away?.id === props.userTeamId
      const hasUser = isUserHome || isUserAway
      const status = formatStatus(props.match)

      return h('div', {
        style: {
          background: 'rgba(22, 0, 32, 0.8)',
          border: hasUser
            ? '1px solid rgba(168, 85, 247, 0.7)'
            : '1px solid rgba(124, 58, 237, 0.25)',
          boxShadow: hasUser ? '0 0 12px rgba(168, 85, 247, 0.35)' : 'none',
          borderRadius: '10px',
          overflow: 'hidden',
          fontSize: '13px',
        }
      }, [
        teamRow(props.home, isUserHome, props.match?.homeScore),
        teamRow(props.away, isUserAway, props.match?.awayScore),
        status
          ? h('div', {
              style: {
                padding: '4px 10px',
                color: '#6B7280',
                fontSize: '11px',
              }
            }, status)
          : null,
      ])
    }
  }
})

const BracketConnector = defineComponent({
  props: { pairs: { type: Number, required: true } },
  setup(props) {
    return () => h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        height: '100%',
        width: '20px',
        gap: '12px',
      }
    }, Array.from({ length: props.pairs }, (_, index) =>
      h('div', {
        key: index,
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

function teamRow(team, isUser, score) {
  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      background: isUser ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
      borderBottom: '1px solid rgba(124, 58, 237, 0.1)',
      color: isUser ? 'white' : '#D1D5DB',
      fontWeight: isUser ? 600 : 400,
    }
  }, [
    teamMark(team),
    h('span', {
      style: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }
    }, team?.name ?? 'TBD'),
    score !== null && score !== undefined
      ? h('span', { style: { color: '#fff', fontWeight: 700 } }, String(score))
      : null,
  ])
}

function teamMark(team) {
  return h(TeamMark, { team, size: 18 })
}

function formatStatus(match) {
  const status = String(match?.status || '').toUpperCase()

  if (!status || status === 'TBD') return ''
  if (status === 'FT') return 'Final'
  if (status === 'NS') return 'Upcoming'
  if (status === 'HT') return 'Half-time'
  if (status === '1H' || status === '2H' || status === 'LIVE') return 'Live'
  return match?.round || status
}
</script>
