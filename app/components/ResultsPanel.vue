<script setup lang="ts">
import {
  compare,
  illustrativePosition,
  createReport,
  metricsCsv,
  metricNames,
  percentiles,
  type Analysis,
  type ComparisonData,
  type Metrics,
  type ParsedFile,
  type Scope,
  type SelfMode,
} from '~/lib/cscore'
import { reference, metricLabels, selfLabel, scopeLabel } from '~/lib/reference'
const assetBase = useRuntimeConfig().app.baseURL.replace(/\/?$/, '/')

const props = defineProps<{ analysis: Analysis; files: ParsedFile[]; isDemo: boolean }>()
const selfMode = defineModel<SelfMode>('selfMode', { required: true })
const scope = ref<Scope>('career')
const tabs = [
  { label: 'Career', value: 'career' },
  { label: 'Single year · 2025', value: 'single-year' },
]
const data = ref<ComparisonData | null>(null)
const subfieldName = ref<string>()
onMounted(async () => {
  data.value = (await import('../../public/reference/v9/comparison.json')).default
})
// One searchable list grouped by field; typing a field name also matches its subfields.
const subfieldGroups = computed(() =>
  (data.value?.scopes.career.fields ?? []).map((f) => [
    { type: 'label' as const, label: f.name, value: '', field: f.name },
    ...data
      .value!.scopes.career.subfields.filter((s) => s.field === f.name)
      .map((s) => ({ label: s.name, value: s.name, field: f.name })),
  ]),
)

const result = computed(
  () =>
    props.analysis.modes.find((m) => m.selfMode === selfMode.value && m.scope === scope.value)
      ?.result,
)
const issue = computed(
  () =>
    props.analysis.modes.find((m) => m.selfMode === selfMode.value && m.scope === scope.value)
      ?.issues[0]?.message,
)
const number = (value: number, places = 0) =>
  value.toLocaleString('en', { maximumFractionDigits: places })

// [subfield rank, c, name, institution, NC, H, Hm, NCS, NCSF, NCSFL]
type PeerRow = [number, number, string, string, number, number, number, number, number, number]
const peerFile = ref<({ count: number } & Record<SelfMode, PeerRow[]>) | null>(null)
const peersLoading = ref(false)
const barFinished = ref(false)
watch(
  [scope, subfieldName, selfMode],
  () => {
    barFinished.value =
      import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },
  { immediate: true, flush: 'sync' },
)
onMounted(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const update = () => {
    if (motion.matches) barFinished.value = true
  }
  update()
  motion.addEventListener('change', update)
  onBeforeUnmount(() => motion.removeEventListener('change', update))
})
watch(
  [scope, subfieldName],
  async ([s, name], _previous, onCleanup) => {
    let current = true
    onCleanup(() => {
      current = false
    })
    peerFile.value = null
    peersLoading.value = !!name
    if (!name) return
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    try {
      const response = await fetch(`${assetBase}reference/v9/peers/${s}/${slug}.json`)
      const loaded = response.ok ? await response.json() : null
      if (current) peerFile.value = loaded
    } catch {
      // Published percentile comparisons remain available if the peer file cannot load.
    } finally {
      if (current) peersLoading.value = false
    }
  },
  { immediate: true, flush: 'sync' },
)
const showYou = computed(() => barFinished.value && !peersLoading.value)
const peers = computed(() =>
  [...(peerFile.value?.[selfMode.value] ?? [])].sort((a, b) => a[0] - b[0]),
)
const compact = (rank: number) =>
  rank >= 1000 ? `${Math.round(rank / 100) / 10}k`.replace('.0k', 'k') : String(Math.round(rank))

const standing = computed(() => {
  const sub = data.value?.scopes[scope.value].subfields.find((s) => s.name === subfieldName.value)
  if (!data.value || !sub || !result.value) return null
  const count = sub.authors
  const c = result.value.cScore
  const placed = compare(c, data.value, scope.value, selfMode.value, sub)
  const top2Rank = Math.floor(0.02 * count)
  const ratio = (rank: number) => Math.log(Math.max(1, rank)) / Math.log(count)
  const at = (rank: number) => `${(ratio(rank) * 100).toFixed(2)}%`
  const align = (rank: number) => ({
    transform: `translateX(${ratio(rank) < 0.1 ? -4 : ratio(rank) > 0.9 ? -96 : -50}%)`,
  })
  // Illustration only: interpolate within published reference points, never extrapolate
  // to #1 or invent a zero-score endpoint. This is not a personal rank estimate.
  const points: [number, number][] =
    selfMode.value === 'with-self'
      ? percentiles.map((p) => [sub.c[p], (1 - Number(p) / 100) * count])
      : peers.value.map((p) => [p[1], p[0]])
  points.sort((a, b) => b[0] - a[0])
  const position = illustrativePosition(c, points)
  const you = position === null ? null : { rank: position }
  // Outside the reference points: mark the edge of the range, never a position beyond it.
  const edge =
    you || !points.length
      ? null
      : c < points.at(-1)![0]
        ? { rank: points.at(-1)![1], text: 'below all listed →' }
        : { rank: points[0]![1], text: '← above all listed' }
  const range = points.length
    ? c > points[0]![0]
      ? 'Above the available reference range'
      : c < points.at(-1)![0]
        ? 'Below the available reference range'
        : 'Within the available reference range'
    : 'No reference position available'
  const band = placed.band
    ?.replace(/^Between the (\w+) and (\w+) percentiles$/, '$1–$2 percentile')
    .replace(/^At or above/, '≥')
  const majors = [1, 10, 100, 1000, 10000, 100000].filter((r) => ratio(r) < 0.88)
  const minors = majors
    .flatMap((d) => [2, 3, 4, 5, 6, 7, 8, 9].map((m) => m * d))
    .filter((r) => r < count)
  return {
    sub,
    count,
    c,
    placed,
    top2Rank,
    ratio,
    at,
    align,
    you,
    edge,
    range,
    band,
    majors,
    minors,
  }
})

const blockRatio = ref(0)
const dragging = ref(false)
const maxRatio = computed(() =>
  standing.value && peers.value.length ? standing.value.ratio(peers.value.at(-1)![0]) : 0,
)
const peerIndex = computed(() => {
  const s = standing.value
  if (!s) return 0
  let best = 0
  peers.value.forEach((p, i) => {
    if (
      Math.abs(s.ratio(p[0]) - blockRatio.value) <
      Math.abs(s.ratio(peers.value[best]![0]) - blockRatio.value)
    )
      best = i
  })
  return best
})
const peer = computed(() => peers.value[peerIndex.value])
const peerAt = computed(() =>
  peer.value && standing.value ? `${standing.value.ratio(peer.value[0]) * 100}%` : '0',
)
watch([peers, () => standing.value?.top2Rank], () => {
  if (standing.value)
    blockRatio.value = Math.min(maxRatio.value, standing.value.ratio(standing.value.top2Rank))
})
const peerContributions = computed(() => {
  const p = peer.value
  if (!p) return undefined
  const d = reference.maxlog[scope.value][selfMode.value]
  return Object.fromEntries(
    metricNames.map((k, i) => [k, Math.log1p(p[4 + i] as number) / d[k]]),
  ) as Metrics
})
const peerText = computed(() =>
  peer.value && standing.value
    ? `${peer.value[2]}, ${peer.value[3]} · V9 rank ${peer.value[0].toLocaleString('en')} of ${standing.value.count.toLocaleString('en')} · ${peer.value[1].toFixed(3)}`
    : '',
)
const track = ref<HTMLElement>()
const near = (rank: number) =>
  dragging.value &&
  !!standing.value &&
  Math.abs(standing.value.ratio(rank) - blockRatio.value) < 0.14
const fineLabels = computed(() => {
  const s = standing.value
  if (!dragging.value || !s) return []
  const gap = 34 / (track.value?.clientWidth || 500)
  const shown: number[] = []
  for (const r of [...s.minors, ...s.majors].filter(near).sort((a, b) => a - b))
    if (shown.every((x) => Math.abs(s.ratio(x) - s.ratio(r)) >= gap)) shown.push(r)
  return shown
})

// Thumb tracks the pointer 1:1, keeping the grab offset; a track press jumps there first.
let grabOffset = 0
let pendingTouch: { x: number; y: number } | null = null
function moveTo(clientX: number) {
  const box = track.value!.getBoundingClientRect()
  const r = (clientX - grabOffset - box.left) / box.width
  blockRatio.value = Math.min(maxRatio.value, Math.max(0, r))
}
function grab(event: PointerEvent) {
  if (!track.value || !peers.value.length) return
  const thumb = (event.target as HTMLElement).closest('.standing-peer')
  grabOffset = thumb
    ? event.clientX - (thumb.getBoundingClientRect().left + thumb.clientWidth / 2)
    : 0
  if (event.pointerType === 'touch') {
    pendingTouch = { x: event.clientX, y: event.clientY }
    return
  }
  track.value.setPointerCapture(event.pointerId)
  dragging.value = true
  if (!thumb) moveTo(event.clientX)
}
function drag(event: PointerEvent) {
  if (pendingTouch) {
    const dx = Math.abs(event.clientX - pendingTouch.x)
    const dy = Math.abs(event.clientY - pendingTouch.y)
    if (Math.max(dx, dy) < 6) return
    pendingTouch = null
    if (dy > dx) return // A vertical swipe scrolls without selecting a reference author.
    track.value?.setPointerCapture(event.pointerId)
    dragging.value = true
  }
  if (dragging.value && track.value) moveTo(event.clientX)
}
function release(event: PointerEvent) {
  if (pendingTouch && event.type === 'pointerup') moveTo(event.clientX)
  pendingTouch = null
  dragging.value = false
  if (peer.value && standing.value) blockRatio.value = standing.value.ratio(peer.value[0])
}
function step(event: KeyboardEvent) {
  const last = peers.value.length - 1
  const i = peerIndex.value
  const next = {
    ArrowRight: i + 1,
    ArrowUp: i + 1,
    ArrowLeft: i - 1,
    ArrowDown: i - 1,
    PageUp: i + 10,
    PageDown: i - 10,
    Home: 0,
    End: last,
  }[event.key]
  if (next === undefined || !standing.value) return
  event.preventDefault()
  blockRatio.value = standing.value.ratio(peers.value[Math.min(last, Math.max(0, next))]![0])
}

function download(kind: 'json' | 'csv') {
  const body =
    kind === 'json'
      ? JSON.stringify(
          {
            ...createReport(props.analysis, props.files, reference),
            syntheticExample: props.isDemo,
          },
          null,
          2,
        )
      : metricsCsv(props.analysis, props.isDemo)
  const url = URL.createObjectURL(
    new Blob([body], { type: kind === 'json' ? 'application/json' : 'text/csv' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `cscore-v9-${props.isDemo ? 'synthetic-' : ''}estimates.${kind}`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section id="results" aria-labelledby="results-heading" class="chapter reveal">
    <div class="chapter-head">
      <h2 id="results-heading">Compare with published data</h2>
      <p>
        {{ selfLabel(selfMode) }}.
        <span class="reference-date"
          >Stanford/Elsevier science-wide author database, version 9 (V9) · citations through 2025 ·
          Scopus snapshot 1 Aug 2026</span
        >
      </p>
    </div>
    <UTabs v-model="scope" :items="tabs" :content="false" class="max-w-sm" />

    <div v-if="result" class="result-grid">
      <div id="comparison">
        <h3 class="result-label">Choose a comparison subfield</h3>
        <USelectMenu
          v-model="subfieldName"
          :items="subfieldGroups"
          value-key="value"
          :filter-fields="['label', 'field']"
          :search-input="{ placeholder: 'Type a subfield or field…' }"
          :disabled="!data"
          placeholder="Search subfields, e.g. Epidemiology"
          aria-label="Comparison subfield"
          size="lg"
          class="subfield-pick"
        />

        <p class="comparison-context">
          You pick the subfield; it is not a verified official classification. This is not a rank or
          Top 2% result.
        </p>
        <div v-if="standing" class="reference-summary" aria-live="polite">
          <p v-if="standing.band" class="reference-band">
            <span>V9 reference band:</span> <strong>{{ standing.band }}</strong>
          </p>
          <p v-else>No published all-author percentile band for this setting.</p>
          <p v-if="standing.placed.top2 !== null">
            V9 top 2% benchmark: <strong>{{ standing.placed.top2.toFixed(3) }}</strong> · historical
            only.
          </p>
          <p v-if="!standing.you">{{ standing.range }}; no personal position is plotted.</p>
        </div>
        <div v-if="subfieldName" class="standing-area">
          <div v-if="standing" class="standing">
            <div
              ref="track"
              class="standing-track"
              @pointerdown="grab"
              @pointermove="drag"
              @pointerup="release"
              @pointercancel="release"
            >
              <div
                :key="`${scope}-${subfieldName}-${selfMode}`"
                class="standing-fill"
                @animationend.self="barFinished = true"
                :style="{ width: standing.at(standing.top2Rank) }"
              />
              <span
                v-for="r in standing.minors"
                :key="`m${r}`"
                class="standing-tick minor"
                :style="{ left: standing.at(r) }"
              />
              <span
                v-for="r in standing.majors.slice(1)"
                :key="`M${r}`"
                class="standing-tick"
                :style="{ left: standing.at(r) }"
              />
              <span
                v-if="peer"
                class="standing-peer"
                :class="{ dragging }"
                role="slider"
                tabindex="0"
                aria-label="Compare with a listed author"
                :aria-valuemin="1"
                :aria-valuemax="peers.length"
                :aria-valuenow="peerIndex + 1"
                :aria-valuetext="peerText"
                :style="{ left: peerAt }"
                @keydown="step"
              >
                <span v-if="dragging" class="standing-readout"
                  >#{{ peer[0].toLocaleString('en') }}</span
                >
              </span>
            </div>
            <span
              v-for="r in standing.majors.filter((r) => !near(r))"
              :key="`a${r}`"
              class="standing-axis"
              aria-hidden="true"
              :style="{ left: standing.at(r), ...standing.align(r) }"
              >{{ r === 1 ? '#1' : compact(r) }}</span
            >
            <span
              class="standing-axis"
              aria-hidden="true"
              :style="{ left: '100%', ...standing.align(standing.count) }"
              >{{ compact(standing.count) }}</span
            >
            <span
              v-for="r in fineLabels"
              :key="`f${r}`"
              class="standing-axis fine"
              aria-hidden="true"
              :style="{ left: standing.at(r), ...standing.align(r) }"
              >{{ compact(r) }}</span
            >
            <span
              v-if="showYou && standing.you"
              class="standing-marker you"
              :class="{ faded: dragging }"
              :style="{ left: standing.at(standing.you.rank) }"
            >
              <span :style="standing.align(standing.you.rank)"
                >{{ isDemo ? 'Synthetic estimate' : 'Your estimate' }}
                {{ standing.c.toFixed(3) }}</span
              >
            </span>
            <span
              v-if="showYou && standing.edge"
              class="standing-marker edge"
              :class="{ faded: dragging }"
              :style="{ left: standing.at(standing.edge.rank) }"
            >
              <span :style="standing.align(standing.edge.rank)"
                >{{ isDemo ? 'Synthetic estimate' : 'Your estimate' }} {{ standing.c.toFixed(3) }} ·
                {{ standing.edge.text }}</span
              >
            </span>
            <span class="standing-marker top2" :style="{ left: standing.at(standing.top2Rank) }">
              <span :style="standing.align(standing.top2Rank)"
                >V9 benchmark<template v-if="standing.placed.top2 !== null">
                  · {{ standing.placed.top2.toFixed(3) }}</template
                ></span
              >
            </span>
          </div>
          <div v-else class="standing">
            <div class="standing-track empty">Loading reference authors…</div>
          </div>
        </div>
        <p v-if="standing" class="comparison-context marker-context">
          Illustrative position, not a personal rank.
          {{
            selfMode === 'with-self'
              ? 'Published percentile benchmarks.'
              : 'Listed-author sample only.'
          }}
        </p>
        <details class="comparison-details">
          <summary>How this comparison works</summary>
          <p>
            Reference ranks use a log scale. An estimate marker is interpolated only between
            available reference points; it is not a calculated personal rank. No position is
            extrapolated. Including-self bands use published benchmarks for authors with at least
            five papers. Excluding-self positions use sampled listed authors and cover only the
            listed range. A historical benchmark does not confirm official inclusion.
          </p>
        </details>
        <p class="fine-print">
          Drag the marker to compare with listed V9 authors.
          <a :href="data?.dataset" target="_blank" rel="noopener noreferrer">V9 data</a> ·
          {{ data?.license }}.
        </p>
      </div>
      <div class="indicator-view">
        <h3 class="result-label">Six score components</h3>
        <div class="legend">
          <span class="legend-row"
            ><span class="swatch you" />{{ isDemo ? 'Synthetic estimate' : 'Your estimate' }} ·
            {{ result.cScore.toFixed(3) }}</span
          >
          <span class="legend-row"
            ><template v-if="peer"
              ><span class="swatch peer" /><strong>{{ peer[2] }}</strong> · V9 #{{
                peer[0].toLocaleString('en')
              }}
              · {{ peer[1].toFixed(3) }}</template
            ></span
          >
          <span class="legend-row sub">{{ peer?.[3] }}</span>
        </div>
        <ContributionChart :result="result" :peer="peerContributions" />
        <div class="sr-only">
          <table>
            <caption>
              {{
                scopeLabel(scope)
              }}
              metrics,
              {{
                selfLabel(selfMode)
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">Indicator</th>
                <th scope="col">Value</th>
                <th scope="col">Contribution</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in metricNames" :key="key">
                <th scope="row">{{ key }} · {{ metricLabels[key] }}</th>
                <td>{{ number(result.metrics[key], key === 'Hm' ? 6 : 0) }}</td>
                <td>{{ result.contributions[key].toFixed(6) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">c-score</th>
                <td></td>
                <td>{{ result.cScore.toFixed(6) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
    <UAlert
      v-else
      color="warning"
      variant="subtle"
      title="Incomplete — this result needs more data"
      :description="issue"
      class="mt-6"
    />

    <div v-if="analysis.modes.some((m) => m.ready)" class="chapter-actions">
      <UButton variant="outline" color="neutral" icon="i-lucide-download" @click="download('json')"
        >Download audit JSON</UButton
      >
      <UButton variant="ghost" color="neutral" @click="download('csv')"
        >Download metrics CSV</UButton
      >
      <span class="muted"
        >Downloads are created on your device and contain no titles or author IDs.</span
      >
    </div>
  </section>
</template>
