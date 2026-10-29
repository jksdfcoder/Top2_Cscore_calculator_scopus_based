<script setup lang="ts">
import {
  compare,
  createReport,
  metricsCsv,
  metricNames,
  percentiles,
  type Analysis,
  type ComparisonData,
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

const standing = computed(() => {
  const sub = data.value?.scopes[scope.value].subfields.find(
    (s) => s.field === field.value && s.name === subfieldName.value,
  )
  if (!data.value || !sub || !result.value) return null
  const c = result.value.cScore
  const placed = compare(c, data.value, scope.value, selfMode.value, sub)
  const ticks =
    selfMode.value === 'with-self' ? percentiles.map((p) => ({ label: p, value: sub.c[p] })) : []
  const values = [c, ...ticks.map((t) => t.value), ...(placed.top2 === null ? [] : [placed.top2])]
  const lo = Math.min(...values) * 0.85
  const hi = Math.max(...values) * 1.12
  const at = (v: number) => `${(((v - lo) / (hi - lo)) * 100).toFixed(2)}%`
  return { sub, c, placed, ticks, at }
})

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
        <ContributionChart :result="result" />
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
          <div class="standing" aria-hidden="true">
            <span class="standing-you" :style="{ left: standing.at(standing.c) }"
              >You {{ standing.c.toFixed(3) }}</span
            >
            <div class="standing-track">
              <div class="standing-fill" :style="{ width: standing.at(standing.c) }" />
              <span
                v-for="t in standing.ticks"
                :key="t.label"
                class="standing-tick"
                :style="{ left: standing.at(t.value) }"
              />
              <span
                v-if="standing.placed.top2 !== null"
                class="standing-tick top2"
                :style="{ left: standing.at(standing.placed.top2) }"
              />
            </div>
            <div class="standing-axis">
              <span
                v-for="t in standing.ticks"
                :key="t.label"
                :style="{ left: standing.at(t.value) }"
                >{{ t.label }}</span
              >
              <span
                v-if="standing.placed.top2 !== null"
                class="top2"
                :style="{ left: standing.at(standing.placed.top2) }"
                >Top 2%</span
              >
            </div>
          </div>
          <ul class="standing-facts">
            <li>
              <template v-if="standing.placed.band"
                >{{ standing.placed.band }} of {{ standing.sub.authors.toLocaleString('en') }}
                {{ standing.sub.name }} authors with ≥5 papers.</template
              >
              <template v-else
                >Official percentiles are published only for scores including
                self-citations.</template
              >
            </li>
            <li v-if="standing.placed.top2 !== null">
              Subfield top 2% line {{ standing.placed.top2.toFixed(3) }} ({{
                signed(standing.placed.top2Gap!)
              }}).
            </li>
            <li>
              Global top 100,000 line {{ standing.placed.top100k.toFixed(3) }} ({{
                signed(standing.placed.top100kGap)
              }}).
            </li>
          </ul>
          <p class="fine-print">
            Comparison only; your score does not change. Your official subfield is the one with most
            of your papers. Crossing a line does not confirm selection. Source:
            <a :href="data!.dataset" target="_blank" rel="noopener noreferrer">V9 Tables 1–2</a>,
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
