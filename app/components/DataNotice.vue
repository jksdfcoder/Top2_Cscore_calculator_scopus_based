<script setup lang="ts">
const notice = ref<HTMLDetailsElement>()
let frame = 0
let returnY = 0
let expanded = false

function toggle(event: MouseEvent) {
  event.preventDefault()
  const element = notice.value!
  cancelAnimationFrame(frame)
  const fromHeight = element.getBoundingClientRect().height
  const fromY = window.scrollY
  const opening = !expanded
  if (opening) returnY = fromY
  expanded = opening
  element.open = true
  element.style.height = ''
  const fullHeight = element.getBoundingClientRect().height
  const summaryHeight = element.querySelector('summary')!.getBoundingClientRect().height
  const toHeight = opening ? fullHeight : summaryHeight
  const top = element.getBoundingClientRect().top + fromY
  const toY = opening ? Math.max(fromY, top - 80) : Math.min(fromY, returnY)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || event.detail === 0
  const duration = reduced ? 0 : 360
  const started = performance.now()
  element.style.overflow = 'hidden'

  function step(now: number) {
    const progress = duration ? Math.min(1, (now - started) / duration) : 1
    const eased = 1 - (1 - progress) ** 3
    element!.style.height = `${fromHeight + (toHeight - fromHeight) * eased}px`
    window.scrollTo({ top: fromY + (toY - fromY) * eased, behavior: 'instant' })
    if (progress < 1) {
      frame = requestAnimationFrame(step)
    } else {
      element!.open = opening
      element!.style.height = ''
      element!.style.overflow = ''
    }
  }
  step(started)
}

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <details ref="notice" class="data-notice">
    <summary @click="toggle">Data use, privacy &amp; licences</summary>
    <div class="data-notice-content"><slot /></div>
  </details>
</template>
