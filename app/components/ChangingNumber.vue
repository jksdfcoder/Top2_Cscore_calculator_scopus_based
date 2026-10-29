<script setup lang="ts">
const props = withDefaults(defineProps<{ value?: number; fallback?: string }>(), { fallback: '—' })
const direction = ref(0)
const revision = ref(0)
watch(
  () => props.value,
  (value, previous) => {
    direction.value =
      value !== undefined && previous !== undefined && value.toFixed(3) !== previous.toFixed(3)
        ? Math.sign(value - previous)
        : 0
    revision.value++
  },
)
</script>

<template>
  <span class="changing-number">
    {{ value === undefined ? fallback : value.toFixed(3) }}
    <svg
      v-if="direction"
      :key="revision"
      class="number-change"
      :class="direction > 0 ? 'increase' : 'decrease'"
      :data-direction="direction > 0 ? 'up' : 'down'"
      viewBox="0 0 16 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      @animationend.self="direction = 0"
    >
      <path :d="direction > 0 ? 'M8 22V2M2 8L8 2L14 8' : 'M8 2v20M2 16l6 6 6-6'" />
    </svg>
  </span>
</template>
