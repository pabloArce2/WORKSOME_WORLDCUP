<template>
  <img
    src="/logo.png"
    alt="Worksome"
    :style="{
      height: size + 'px',
      width: 'auto',
      filter: 'invert(1)',
      display: 'block',
    }"
  />
</template>

<script setup>
defineProps({
  size: { type: Number, default: 24 },
})
</script>
