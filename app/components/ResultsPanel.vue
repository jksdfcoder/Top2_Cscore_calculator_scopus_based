<script setup lang="ts">
import {
  createReport,
  metricsCsv,
  metricNames,
  type Analysis,
  type ParsedFile,
  type SelfMode,
} from '~/lib/cscore'
import { reference, metricLabels, selfLabel, scopeLabel } from '~/lib/reference'

const props = defineProps<{ analysis: Analysis; files: ParsedFile[]; isDemo: boolean }>()
const selfMode = ref<SelfMode>('without-self')
const selectedScope = ref('career')
const tabs = [
  { label: 'Career', value: 'career' },
  { label: 'Single year · 2025', value: 'single-year' },
]
const selfOptions = [
  { label: 'Exclude all-author self-citations', value: 'without-self' },
  { label: 'Include self-citations', value: 'with-self' },
]
const summaries = computed(() => props.analysis.modes.filter((m) => m.selfMode === selfMode.value))
watch(
  () => props.analysis,
  (value) => {
    if (!value.modes.some((m) => m.selfMode === selfMode.value && m.ready)) {
      const available = value.modes.find((m) => m.ready)
      if (available) selfMode.value = available.selfMode
    }
  },
  { immediate: true },
)
const detail = computed(() => summaries.value.find((m) => m.scope === selectedScope.value))
const rows = computed(() =>
  detail.value?.result
    ? metricNames.map((key) => ({
        metric: key,
        description: metricLabels[key],
        value: detail.value!.result!.metrics[key],
        contribution: detail.value!.result!.contributions[key],
      }))
    : [],
)
const number = (value: number, places = 0) =>
  value.toLocaleString('en', { maximumFractionDigits: places })

function download(kind: 'json' | 'csv') {
  const data =
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
    new Blob([data], { type: kind === 'json' ? 'application/json' : 'text/csv' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `cscore-v9-${props.isDemo ? 'synthetic-' : ''}results.${kind}`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section id="results" aria-labelledby="results-heading" class="page-section">
    <div class="section-heading">
      <div>
        <h2 id="results-heading">Your results</h2>
        <p class="text-muted">
          {{
            isDemo
              ? 'Synthetic example · not a real researcher'
              : 'Calculated from your export snapshot'
          }}
          · V9 normalization
        </p>
      </div>
      <USelect
        v-model="selfMode"
        :items="selfOptions"
        value-key="value"
        aria-label="Self-citation setting"
        class="mode-select"
      />
    </div>
    <div class="summary-container">
      <div class="score-grid">
        <div v-for="mode in summaries" :key="mode.scope" class="score-summary">
          <h3>{{ scopeLabel(mode.scope) }}</h3>
          <p class="score-value">
            {{ mode.result ? mode.result.cScore.toFixed(6) : 'Incomplete' }}
          </p>
          <p class="text-muted">
            {{
              mode.scope === 'career'
                ? 'Citations received 1996–2025'
                : 'Citations received during 2025'
            }}
          </p>
          <p v-if="mode.result" class="text-muted">
            {{ number(mode.result.paperCount) }} publications through 2025
          </p>
          <p v-else class="text-warning">
            {{ mode.issues[0]?.message || 'More input is needed.' }}
          </p>
        </div>
      </div>
    </div>
    <p class="result-note">
      These are reference scores, not confirmation of Top 2% selection. The official V9 database
      uses a frozen Scopus snapshot; later exports can produce different results.
    </p>
    <UTabs v-model="selectedScope" :items="tabs" :content="false" class="detail-tabs" />
    <div v-if="detail?.result" class="metric-container">
      <div class="metric-grid">
        <div class="table-scroll" tabindex="0" role="region" aria-label="Citation metric details">
          <table class="metric-table">
            <caption class="sr-only">
              {{
                scopeLabel(selectedScope)
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
                <th scope="col">Score contribution</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.metric">
                <th scope="row">
                  <strong>{{ row.metric }}</strong
                  ><span>{{ row.description }}</span>
                </th>
                <td>{{ number(row.value, row.metric === 'Hm' ? 6 : 0) }}</td>
                <td>{{ row.contribution.toFixed(6) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">c-score</th>
                <td></td>
                <td>{{ detail.result.cScore.toFixed(6) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ContributionChart :result="detail.result" />
      </div>
    </div>
    <UAlert
      v-else
      color="warning"
      variant="subtle"
      title="This result needs more data"
      :description="detail?.issues[0]?.message"
      class="mt-4"
    />
    <div class="download-actions">
      <UButton
        variant="outline"
        color="neutral"
        :disabled="!analysis.modes.some((m) => m.ready)"
        @click="download('json')"
        >Download audit JSON</UButton
      >
      <UButton
        variant="ghost"
        color="neutral"
        :disabled="!analysis.modes.some((m) => m.ready)"
        @click="download('csv')"
        >Download metrics CSV</UButton
      >
      <span class="text-muted text-sm"
        >Includes available modes; incomplete modes are identified in the audit.</span
      >
    </div>
  </section>
</template>
