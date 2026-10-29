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
const selfMode = defineModel<SelfMode>('selfMode', { required: true })
const selectedScope = ref('career')
const tabs = [
  { label: 'Career', value: 'career' },
  { label: 'Single year · 2025', value: 'single-year' },
]
const detail = computed(() =>
  props.analysis.modes.find(
    (m) => m.selfMode === selfMode.value && m.scope === selectedScope.value,
  ),
)
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
  <section id="results" aria-labelledby="results-heading" class="chapter reveal">
    <div class="chapter-head">
      <h2 id="results-heading">What drives your score.</h2>
      <p>
        Each indicator adds ln(1 + value) ÷ the V9 reference maximum. {{ selfLabel(selfMode) }}.
      </p>
    </div>
    <UTabs v-model="selectedScope" :items="tabs" :content="false" class="max-w-sm" />
    <div v-if="detail?.result" class="chapter-body">
      <div class="detail-grid">
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
                <th scope="col">Contribution</th>
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
      title="Incomplete — this result needs more data"
      :description="detail?.issues[0]?.message"
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
