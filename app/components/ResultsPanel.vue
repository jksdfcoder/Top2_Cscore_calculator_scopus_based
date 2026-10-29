<script setup lang="ts">
import {
  compare,
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

const props = defineProps<{ analysis: Analysis; files: ParsedFile[]; isDemo: boolean }>()
const selfMode = defineModel<SelfMode>('selfMode', { required: true })
const scope = ref<Scope>('career')
const tabs = [
  { label: 'Career', value: 'career' },
  { label: 'Single year · 2025', value: 'single-year' },
]
const data = ref<ComparisonData | null>(null)
const field = ref<string>()
const subfieldName = ref<string>()
onMounted(async () => {
  data.value = (await import('../../public/reference/v9/comparison.json')).default
})
watch(field, () => {
  subfieldName.value = undefined
})
const fieldNames = computed(() => data.value?.scopes.career.fields.map((f) => f.name) ?? [])
const subfieldNames = computed(
  () =>
    data.value?.scopes.career.subfields.filter((s) => s.field === field.value).map((s) => s.name) ??
    [],
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
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(3)}`

// [subfield rank, c, name, institution, NC, H, Hm, NCS, NCSF, NCSFL]
type PeerRow = [number, number, string, string, number, number, number, number, number, number]
const peerFile = ref<({ count: number } & Record<SelfMode, PeerRow[]>) | null>(null)
watch(
  [scope, subfieldName],
  async ([s, name]) => {
    peerFile.value = null
    if (!name) return
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const response = await fetch(`/reference/v9/peers/${s}/${slug}.json`)
    if (response.ok && scope.value === s && subfieldName.value === name)
      peerFile.value = await response.json()
  },
  { immediate: true },
)
const peers = computed(() =>
  [...(peerFile.value?.[selfMode.value] ?? [])].sort((a, b) => a[1] - b[1]),
)

const standing = computed(() => {
  const sub = data.value?.scopes[scope.value].subfields.find(
    (s) => s.field === field.value && s.name === subfieldName.value,
  )
  if (!data.value || !sub || !result.value) return null
  const c = result.value.cScore
  const placed = compare(c, data.value, scope.value, selfMode.value, sub)
  const ticks =
    selfMode.value === 'with-self' ? percentiles.map((p) => ({ label: p, value: sub.c[p] })) : []
  const values = [
    c,
    ...ticks.map((t) => t.value),
    ...(placed.top2 === null ? [] : [placed.top2]),
    ...peers.value.map((p) => p[1]),
  ]
  const lo = Math.min(...values) * 0.9
  const hi = Math.max(...values) * 1.03
  const ratio = (v: number) => (v - lo) / (hi - lo)
  const at = (v: number) => `${(ratio(v) * 100).toFixed(2)}%`
  const align = (v: number) => ({
    transform: `translateX(${ratio(v) < 0.15 ? -2 : ratio(v) > 0.85 ? -98 : -50}%)`,
  })
  const band = placed.band
    ?.replace(/^Between the (\w+) and (\w+) percentiles$/, '$1–$2 percentile')
    .replace(/^At or above/, '≥')
  let last = -1
  const labels = ticks.filter((t) => {
    const keep = ratio(t.value) - last > 0.08
    if (keep) last = ratio(t.value)
    return keep
  })
  return { sub, c, placed, ticks, labels, band, lo, hi, at, align }
})

const peerIndex = ref(0)
function nearest(c: number) {
  let best = 0
  peers.value.forEach((p, i) => {
    if (Math.abs(p[1] - c) < Math.abs(peers.value[best]![1] - c)) best = i
  })
  return best
}
watch([peers, () => standing.value?.placed.top2], () => {
  peerIndex.value = nearest(standing.value?.placed.top2 ?? 0)
})
const peer = computed(() => peers.value[peerIndex.value])
const peerContributions = computed(() => {
  const p = peer.value
  if (!p) return undefined
  const d = reference.maxlog[scope.value][selfMode.value]
  return Object.fromEntries(
    metricNames.map((k, i) => [k, Math.log1p(p[4 + i] as number) / d[k]]),
  ) as Metrics
})
const peerText = computed(() =>
  peer.value && peerFile.value
    ? `${peer.value[2]}, ${peer.value[3]} · rank ${peer.value[0].toLocaleString('en')} of ${peerFile.value.count.toLocaleString('en')} · ${peer.value[1].toFixed(3)}`
    : '',
)
const track = ref<HTMLElement>()
function pick(event: PointerEvent) {
  if (!standing.value || !track.value || !peers.value.length) return
  const box = track.value.getBoundingClientRect()
  const { lo, hi } = standing.value
  peerIndex.value = nearest(lo + ((event.clientX - box.left) / box.width) * (hi - lo))
}
function grab(event: PointerEvent) {
  track.value?.setPointerCapture(event.pointerId)
  pick(event)
}
function step(event: KeyboardEvent) {
  const last = peers.value.length - 1
  const next = {
    ArrowRight: peerIndex.value + 1,
    ArrowUp: peerIndex.value + 1,
    ArrowLeft: peerIndex.value - 1,
    ArrowDown: peerIndex.value - 1,
    PageUp: peerIndex.value + 10,
    PageDown: peerIndex.value - 10,
    Home: 0,
    End: last,
  }[event.key]
  if (next === undefined) return
  event.preventDefault()
  peerIndex.value = Math.min(last, Math.max(0, next))
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
      : metricsCsv(props.analysis)
  const url = URL.createObjectURL(
    new Blob([body], { type: kind === 'json' ? 'application/json' : 'text/csv' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `cscore-v9-${props.isDemo ? 'synthetic-' : ''}results.${kind}`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section id="results" aria-labelledby="results-heading" class="chapter reveal">
    <div class="chapter-head">
      <h2 id="results-heading">Score and standing.</h2>
      <p>{{ selfLabel(selfMode) }}.</p>
    </div>
    <UTabs v-model="scope" :items="tabs" :content="false" class="max-w-sm" />

    <div v-if="result" class="result-grid">
      <div>
        <h3 class="result-label">What drives it</h3>
        <p class="legend">
          <span><span class="swatch you" />You</span>
          <span v-if="peer"><span class="swatch peer" />{{ peerText }}</span>
        </p>
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

      <div id="comparison">
        <h3 class="result-label">Where it stands</h3>
        <div class="pick-row">
          <USelectMenu
            v-model="field"
            :items="fieldNames"
            :disabled="!data"
            placeholder="Field"
            aria-label="Field"
          />
          <USelectMenu
            v-model="subfieldName"
            :items="subfieldNames"
            :disabled="!field"
            placeholder="Subfield"
            aria-label="Subfield"
          />
        </div>

        <template v-if="standing">
          <div class="standing">
            <div
              ref="track"
              class="standing-track"
              @pointerdown="grab"
              @pointermove="(e) => e.buttons && pick(e)"
            >
              <div class="standing-fill" :style="{ width: standing.at(standing.c) }" />
              <span
                v-for="t in standing.ticks"
                :key="t.label"
                class="standing-tick"
                :style="{ left: standing.at(t.value) }"
              />
              <span
                v-if="peer"
                class="standing-peer"
                role="slider"
                tabindex="0"
                aria-label="Compare with a listed author"
                :aria-valuemin="1"
                :aria-valuemax="peers.length"
                :aria-valuenow="peerIndex + 1"
                :aria-valuetext="peerText"
                :style="{ left: standing.at(peer[1]) }"
                @keydown="step"
              />
            </div>
            <span
              v-for="t in standing.labels"
              :key="t.label"
              class="standing-pct"
              aria-hidden="true"
              :style="{ left: standing.at(t.value), ...standing.align(t.value) }"
              >{{ t.label }}th</span
            >
            <span class="standing-marker you" :style="{ left: standing.at(standing.c) }">
              <span :style="standing.align(standing.c)"
                >You {{ standing.c.toFixed(3)
                }}<template v-if="standing.band"> · {{ standing.band }}</template></span
              >
            </span>
            <span
              v-if="standing.placed.top2 !== null"
              class="standing-marker top2"
              :style="{ left: standing.at(standing.placed.top2) }"
            >
              <span :style="standing.align(standing.placed.top2)"
                >Top 2% {{ standing.placed.top2.toFixed(3) }}</span
              >
            </span>
          </div>
          <p class="sr-only">
            {{ standing.placed.band ?? 'No published percentile for this mode' }} of
            {{ standing.sub.authors.toLocaleString('en') }} {{ standing.sub.name }} authors.
            <template v-if="standing.placed.top2 !== null"
              >Subfield top 2% line {{ standing.placed.top2.toFixed(3) }} ({{
                signed(standing.placed.top2Gap!)
              }}).</template
            >
            Global top 100,000 line {{ standing.placed.top100k.toFixed(3) }} ({{
              signed(standing.placed.top100kGap)
            }}).
          </p>
          <p class="fine-print">
            <template v-if="peers.length">Drag the block to compare with a listed author. </template
            >Comparison only; crossing a line does not confirm selection.
            <a :href="data!.dataset" target="_blank" rel="noopener noreferrer">V9 data</a>,
            {{ data!.license }}.
          </p>
        </template>
        <p v-else class="muted">Choose a field and subfield to see where your score stands.</p>
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
      <span class="muted">Created on your device. No titles or author IDs included.</span>
    </div>
  </section>
</template>
