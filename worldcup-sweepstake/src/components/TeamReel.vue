<template>
  <div class="flex flex-col items-center gap-6">
    <!-- Reel viewport -->
    <div class="relative overflow-hidden rounded-2xl"
         style="width: 220px; height: 240px; background: rgba(22, 0, 32, 0.9); border: 1px solid rgba(124, 58, 237, 0.4);">

      <!-- Top/bottom fade masks -->
      <div class="absolute inset-x-0 top-0 h-16 pointer-events-none z-10"
           style="background: linear-gradient(to bottom, rgba(13,0,20,0.9), transparent);"></div>
      <div class="absolute inset-x-0 bottom-0 h-16 pointer-events-none z-10"
           style="background: linear-gradient(to top, rgba(13,0,20,0.9), transparent);"></div>

      <!-- Centre highlight -->
      <div class="absolute inset-x-0 z-10 pointer-events-none"
           style="top: 50%; transform: translateY(-50%); height: 72px; background: rgba(124, 58, 237, 0.15); border-top: 1px solid rgba(124, 58, 237, 0.5); border-bottom: 1px solid rgba(124, 58, 237, 0.5);"></div>

      <!-- Scrolling reel — only flags while spinning, name revealed on stop -->
      <div ref="reelEl" class="flex flex-col" style="will-change: transform;">
        <div v-for="(team, i) in reelItems" :key="i"
             class="flex flex-col items-center justify-center flex-shrink-0"
             style="height: 72px;">
          <span class="text-5xl leading-none">{{ team.flag }}</span>
          <!-- Name only visible once stopped and this is the final item -->
          <span class="text-sm font-semibold text-white mt-1 transition-opacity duration-500"
                :style="{ opacity: !isSpinning && i === finalIndex ? 1 : 0 }">
            {{ team.name }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import teams from '../assets/data/teams.json'

const props = defineProps({
  teamId: { type: String, required: true },
})

const emit = defineEmits(['done'])

const reelEl = ref(null)
const isSpinning = ref(true)
const ITEM_HEIGHT = 72

const targetIndex = teams.findIndex(t => t.id === props.teamId)
const loops = 5

const reelItems = [
  ...Array.from({ length: loops }, () => teams).flat(),
  ...teams.slice(0, targetIndex + 1),
]

const finalIndex = reelItems.length - 1

onMounted(() => {
  const el = reelEl.value
  if (!el) return

  const startY = 120 - ITEM_HEIGHT / 2
  const endY = startY - finalIndex * ITEM_HEIGHT

  gsap.set(el, { y: startY })
  gsap.to(el, {
    y: endY,
    duration: 4,
    ease: 'power3.inOut',
    delay: 0.3,
    onComplete: () => {
      isSpinning.value = false
      emit('done')
    },
  })
})
</script>
