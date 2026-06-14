<template>
  <span class="team-mark" :style="markStyle">
    <img
      v-if="showLogo"
      :src="team.logo"
      :alt="team.name"
      class="team-mark__logo"
      @error="imageFailed = true"
    />
    <span v-else-if="team?.flag" class="team-mark__flag" :style="flagStyle">{{ team.flag }}</span>
    <span v-else class="team-mark__empty"></span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  team: { type: Object, default: null },
  size: { type: Number, default: 24 },
})

const imageFailed = ref(false)

const showLogo = computed(() => Boolean(props.team?.logo && !imageFailed.value))

const markStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const flagStyle = computed(() => ({
  fontSize: `${Math.round(props.size * 0.8)}px`,
}))

watch(() => props.team?.logo, () => {
  imageFailed.value = false
})
</script>

<style scoped>
.team-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.team-mark__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 999px;
}

.team-mark__flag {
  line-height: 1;
}

.team-mark__empty {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: rgba(124, 58, 237, 0.35);
}
</style>
