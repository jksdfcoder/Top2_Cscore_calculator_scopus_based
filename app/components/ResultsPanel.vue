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
  [...(peerFile.value?.[selfMode.value] ?? [])].sort((a, b) => a[0] - b[0]),
)
const compact = (rank: number) =>
  rank >= 1000 ? `${Math.round(rank / 100) / 10}k`.replace('.0k', 'k') : String(Math.round(rank))

const standing = computed(() => {
  const sub = data.value?.scopes[scope.value].subfields.find(
    (s) => s.field === field.value && s.name === subfieldName.value,
  )
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
  // Your rank: interpolated in log rank between listed authors, else between the published
  // all-author percentiles (with self-citations only). Without either, it is not placed.
  const points: [number, number][] = peers.value.map((p) => [p[1], p[0]])
  if (selfMode.value === 'with-self')
    points.push(
      ...percentiles.map((p): [number, number] => [sub.c[p], (1 - Number(p) / 100) * count]),
      [0, count],
    )
  points.sort((a, b) => b[0] - a[0])
  const listedFloor = peers.value.at(-1)?.[1] ?? Infinity
  let you: { rank: number; listed: boolean } | null = null
  if (points.length && c >= points[0]![0]) you = { rank: 1, listed: true }
  for (let i = 1; !you && i < points.length; i++) {
    const [hiC, hiRank] = points[i - 1]!
    const [loC, loRank] = points[i]!
    if (c < loC || loRank < hiRank) continue
    const t = hiC === loC ? 0 : (hiC - c) / (hiC - loC)
    const rank = Math.exp(Math.log(hiRank) + t * (Math.log(loRank) - Math.log(hiRank)))
    you = { rank, listed: c >= listedFloor }
  }
  const band = placed.band
    ?.replace(/^Between the (\w+) and (\w+) percentiles$/, '$1–$2 percentile')
    .replace(/^At or above/, '≥')
  const majors = [1, 10, 100, 1000, 10000, 100000].filter((r) => ratio(r) < 0.88)
  const minors = majors
    .flatMap((d) => [2, 3, 4, 5, 6, 7, 8, 9].map((m) => m * d))
    .filter((r) => r < count)
  return { sub, count, c, placed, top2Rank, ratio, at, align, you, band, majors, minors }
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
    ? `${peer.value[2]}, ${peer.value[3]} · rank ${peer.value[0].toLocaleString('en')} of ${standing.value.count.toLocaleString('en')} · ${peer.value[1].toFixed(3)}`
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
function moveTo(clientX: number) {
  const box = track.value!.getBoundingClientRect()
  const r = (clientX - grabOffset - box.left) / box.width
  blockRatio.value = Math.min(maxRatio.value, Math.max(0, r))
}
function grab(event: PointerEvent) {
  if (!track.value || !peers.value.length) return
  track.value.setPointerCapture(event.pointerId)
  dragging.value = true
  const thumb = (event.target as HTMLElement).closest('.standing-peer')
  grabOffset = thumb
    ? event.clientX - (thumb.getBoundingClientRect().left + thumb.clientWidth / 2)
    : 0
  if (!thumb) moveTo(event.clientX)
}
function drag(event: PointerEvent) {
  if (dragging.value && track.value) moveTo(event.clientX)
}
function release() {
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
        <div class="legend">
          <span class="legend-row"
            ><span class="swatch you" />You · {{ result.cScore.toFixed(3) }}</span
          >
          <span class="legend-row"
            ><template v-if="peer"
              ><span class="swatch peer" /><strong>{{ peer[2] }}</strong> · #{{
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

        <div class="standing-area">
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
                :key="`${scope}-${subfieldName}`"
                class="standing-fill"
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
              v-if="standing.you"
              class="standing-marker you"
              :class="{ faded: dragging }"
              :style="{ left: standing.at(standing.you.rank) }"
            >
              <span :style="standing.align(standing.you.rank)"
                >You {{ standing.c.toFixed(3) }} ·
                {{
                  standing.you.listed
                    ? `≈ #${Math.round(standing.you.rank).toLocaleString('en')}`
                    : standing.band
                }}</span
              >
            </span>
            <span v-else class="standing-marker you no-line" style="left: 100%">
              <span style="transform: translateX(-100%)"
                >You {{ standing.c.toFixed(3) }} · below the listed range</span
              >
            </span>
            <span class="standing-marker top2" :style="{ left: standing.at(standing.top2Rank) }">
              <span :style="standing.align(standing.top2Rank)"
                >Top 2% · #{{ standing.top2Rank.toLocaleString('en')
                }}<template v-if="standing.placed.top2 !== null">
                  · {{ standing.placed.top2.toFixed(3) }}</template
                ></span
              >
            </span>
          </div>
          <div v-else class="standing">
            <div class="standing-track empty">Choose a field and subfield</div>
          </div>
        </div>
        <template v-if="standing">
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
        </template>
        <p class="fine-print">
          Rank in subfield, log scale. Drag or click to compare with a listed author; arrow keys
          step one author. Crossing a line does not confirm official inclusion.
          <a :href="data?.dataset" target="_blank" rel="noopener noreferrer">V9 data</a>,
          {{ data?.license }}.
        </p>
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
