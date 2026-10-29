<script setup lang="ts">
import type { Issue } from '~/lib/cscore'
import { selfLabel } from '~/lib/reference'

const {
  files,
  selectedAuthor,
  authors,
  analysis,
  busy,
  error,
  isDemo,
  importFiles,
  removeFile,
  calculate,
  resolve,
  clear,
  loadDemo,
} = useAnalysis()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const pendingFiles = ref<File[] | null>(null)
const manualAuthor = ref(false)
const tableColumns = [
  { accessorKey: 'name', header: 'File' },
  { accessorKey: 'type', header: 'Detected contents' },
  { accessorKey: 'rows', header: 'Rows' },
  { accessorKey: 'remove', header: '' },
]
const fileRows = computed(() =>
  files.value.map((f) => ({
    id: f.id,
    name: f.name,
    type:
      f.kind === 'publications'
        ? 'Documents · ordered authors'
        : f.kind === 'overview'
          ? selfLabel(f.selfMode)
          : 'Unrecognized CSV',
    rows: (f.papers.length || f.rows.length).toLocaleString(),
    years: f.years.length ? `${Math.min(...f.years)}–${Math.max(...f.years)}` : '',
  })),
)
const issues = computed(() => {
  if (!analysis.value) return files.value.flatMap((f) => f.issues)
  const all = [...analysis.value.issues, ...analysis.value.modes.flatMap((m) => m.issues)]
  return [
    ...new Map(
      all.map((issue) => [
        `${issue.code}:${issue.fileId}:${issue.row}:${issue.eid}:${issue.message}`,
        issue,
      ]),
    ).values(),
  ]
})
const groupedIssues = computed(() =>
  [...new Set(issues.value.map((i) => i.code))].map((code) => ({
    code,
    message: issues.value.find((i) => i.code === code)!.message,
    count: issues.value.filter((i) => i.code === code).length,
  })),
)
const reviewIssues = computed(() =>
  issues.value.filter((i) => i.decisionKey && i.candidates?.length),
)
const reviewLimit = ref(20)
const reviewChoices = ref<Record<string, string>>({})
const resolvedCount = ref(0)
watch(pendingFiles, async (incoming) => {
  if (!incoming?.length) return
  await importFiles(incoming)
  pendingFiles.value = null
  reviewChoices.value = {}
  resolvedCount.value = 0
})
function choose(issue: Issue, value: string) {
  if (!issue.decisionKey || !value) return
  reviewChoices.value[issue.decisionKey] = value
  resolve(issue.decisionKey, value)
  resolvedCount.value++
  // Re-run to reveal remaining issues without allowing a stale result to persist.
  calculate()
}
function reset() {
  clear()
  pendingFiles.value = null
  reviewChoices.value = {}
  resolvedCount.value = 0
}
const hasReady = computed(() => analysis.value?.modes.some((m) => m.ready) ?? false)
const latestStatus = computed(() =>
  busy.value
    ? 'Reading files on your device.'
    : analysis.value
      ? `${analysis.value.modes.filter((m) => m.ready).length} of 4 results available.`
      : files.value.length
        ? 'Files received. Confirm your author ID, then calculate.'
        : 'No files selected.',
)
</script>

<template>
  <div class="app-shell">
    <a href="#import" class="skip-link">Skip to file import</a>
    <header class="site-header">
      <a href="#" class="brand">C-score calculator</a>
      <nav aria-label="Page sections">
        <a href="#guide">Export guide</a><a href="#method">Method & privacy</a
        ><a
          href="https://github.com/jksdfcoder/Top2_Cscore_calculator_scopus_based"
          target="_blank"
          rel="noopener noreferrer"
          >Source code</a
        >
      </nav>
    </header>
    <main>
      <section class="introduction" aria-labelledby="page-title">
        <h1 id="page-title">
          Your citation impact,<br class="optional-break" />
          with the calculation open.
        </h1>
        <p>
          Import your Scopus exports to calculate career and single-year c-scores. See the six
          indicators behind each result.
        </p>
        <div class="intro-actions">
          <span class="local-label"
            ><UIcon name="i-lucide-hard-drive" />Files stay on your device</span
          ><UButton variant="link" color="neutral" :disabled="busy || !mounted" @click="loadDemo"
            >Try a synthetic example</UButton
          >
        </div>
      </section>

      <section id="guide" class="guide-section" aria-label="Export help"><ExportGuide /></section>

      <section id="import" class="page-section" aria-labelledby="import-heading">
        <div class="section-heading">
          <div>
            <h2 id="import-heading">Import your data</h2>
            <p class="text-muted">
              One documents CSV and two Citation overview CSVs. Add earlier windows only when
              requested.
            </p>
          </div>
          <UBadge color="neutral" variant="subtle">V9 · citations through 2025</UBadge>
        </div>
        <UFileUpload
          v-model="pendingFiles"
          multiple
          accept=".csv,text/csv"
          icon="i-lucide-upload"
          label="Drop your Scopus CSV files here"
          description="Or click to select files · local processing · up to 30 MB per file"
          :disabled="busy || !mounted"
          class="file-drop"
        />
        <p role="status" aria-live="polite" class="import-status">{{ latestStatus }}</p>
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          title="Could not complete this action"
          :description="error"
          class="mb-4"
        />
        <template v-if="files.length">
          <UBadge v-if="isDemo" color="warning" variant="subtle" class="mb-3"
            >Synthetic example · author ID 123</UBadge
          >
          <UTable
            :data="fileRows"
            :columns="tableColumns"
            class="file-table"
            aria-label="Imported files"
          >
            <template #name-cell="{ row }"
              ><span class="file-name">{{ row.original.name }}</span
              ><span v-if="row.original.years" class="file-years"
                >Citation years {{ row.original.years }}</span
              ></template
            >
            <template #remove-cell="{ row }"
              ><UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :aria-label="`Remove ${row.original.name}`"
                @click="removeFile(row.original.id)"
                >Remove</UButton
              ></template
            >
          </UTable>
          <div class="identity-container">
            <div class="identity-row">
              <UFormField
                label="Confirm your Scopus Author ID"
                description="Candidates are ordered by appearances in the imported documents. Check the ID against your author profile."
                class="identity-field"
              >
                <USelectMenu
                  v-if="!manualAuthor"
                  v-model="selectedAuthor"
                  :items="authors"
                  value-key="value"
                  aria-label="Scopus Author ID"
                  class="w-full"
                />
                <UInput
                  v-else
                  v-model="selectedAuthor"
                  aria-label="Scopus Author ID"
                  placeholder="Author ID, or comma-separated IDs you own"
                  class="w-full"
                />
              </UFormField>
              <UButton :disabled="busy || !selectedAuthor" @click="calculate"
                >Confirm author & calculate</UButton
              >
            </div>
          </div>
          <div class="import-actions">
            <UButton variant="link" color="neutral" @click="manualAuthor = !manualAuthor">{{
              manualAuthor ? 'Choose an ID from the files' : 'Enter an ID or multiple IDs'
            }}</UButton
            ><UButton color="neutral" variant="ghost" @click="reset">Clear all data</UButton>
          </div>
        </template>
        <UButton v-else-if="busy" color="neutral" variant="ghost" @click="reset"
          >Cancel import</UButton
        >
      </section>

      <section
        v-if="issues.length"
        id="review"
        class="page-section"
        aria-labelledby="review-heading"
      >
        <h2 id="review-heading">Check your data</h2>
        <p class="text-muted">
          Resolve the items below, then calculate again. Missing values are never treated as zero.
        </p>
        <div class="issue-list">
          <UAlert
            v-for="item in groupedIssues"
            :key="item.code"
            color="warning"
            variant="subtle"
            :title="item.message"
            :description="
              item.count > 1
                ? `${item.count.toLocaleString()} affected records or results. ${item.code}`
                : item.code
            "
          />
        </div>
        <div
          v-for="issue in reviewIssues.slice(0, reviewLimit)"
          :key="issue.decisionKey"
          class="match-review"
        >
          <p>{{ files.find((f) => f.id === issue.fileId)?.name }} · row {{ issue.row }}</p>
          <UFormField label="Choose the matching publication" :description="issue.message">
            <USelectMenu
              :model-value="reviewChoices[issue.decisionKey!]"
              :items="
                issue.candidates!.map((c) => ({
                  value: c.eid,
                  label: `${c.title} — ${c.sourceTitle} (${c.eid})`,
                }))
              "
              value-key="value"
              placeholder="Inspect and select a candidate"
              class="w-full"
              @update:model-value="(value) => choose(issue, value as string)"
            />
          </UFormField>
        </div>
        <UButton
          v-if="reviewIssues.length > reviewLimit"
          color="neutral"
          variant="outline"
          @click="reviewLimit += 20"
          >Show more records</UButton
        >
        <p v-if="resolvedCount" role="status">{{ resolvedCount }} matching decisions applied.</p>
        <p
          v-if="
            groupedIssues.some(
              (i) =>
                i.code.includes('year') || i.code.includes('coverage') || i.code.includes('bucket'),
            )
          "
          class="mt-4"
        >
          <a href="#guide">See the early-window export instructions above.</a> Add the extra CSVs to
          your existing files.
        </p>
      </section>

      <ResultsPanel v-if="analysis" :analysis="analysis" :files="files" :is-demo="isDemo" />

      <section
        v-if="hasReady"
        class="page-section comparison-note"
        aria-labelledby="comparison-heading"
      >
        <h2 id="comparison-heading">Official field comparisons</h2>
        <p>
          The calculator currently provides your metrics and their contributions. Author-by-author
          and subfield comparisons are not available in this preview. A c-score alone does not
          establish Top 2% selection.
        </p>
        <a
          href="https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/9"
          target="_blank"
          rel="noopener noreferrer"
          >View the official V9 dataset</a
        >
      </section>

      <section id="method" class="page-section method-section" aria-labelledby="method-heading">
        <h2 id="method-heading">How the score is calculated</h2>
        <p>
          Six indicators combine citation impact, coauthorship and author position. Each contributes
          <code>ln(1 + indicator) / reference maxlog</code>; the six contributions are summed.
        </p>
        <p>
          Career uses citations received in 1996–2025. Single-year uses citations received in 2025,
          including those to older papers. Both use publications dated through 2025. Excluding
          self-citations means excluding citations with any author shared between the citing and
          cited paper.
        </p>
        <p>
          Normalization uses the official V9 parameter tables. V9 was published on 7 October 2026
          using the 1 August 2026 Scopus snapshot. Your later export can differ, even with the same
          year filters. This independent tool is not affiliated with Stanford or Elsevier.
        </p>
        <div class="method-links">
          <a
            href="https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000918"
            target="_blank"
            rel="noopener noreferrer"
            >Published methodology</a
          ><a
            href="https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/9"
            target="_blank"
            rel="noopener noreferrer"
            >Data and normalization parameters</a
          >
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <span>Open calculation. Local files.</span><a href="#guide">Privacy & export help</a
      ><a href="#page-title">Back to top</a>
    </footer>
  </div>
</template>
