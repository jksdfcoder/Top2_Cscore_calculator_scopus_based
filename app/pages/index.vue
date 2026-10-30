<script setup lang="ts">
import type { Issue, SelfMode } from '~/lib/cscore'
import { metricNames } from '~/lib/cscore'
import { metricDescriptions, metricLabels, selfLabel } from '~/lib/reference'

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
} = useAnalysis(useRuntimeConfig().app.baseURL)
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const pendingFiles = ref<File[] | null>(null)
const manualAuthor = ref(false)
const guideOpen = ref(false)
const methodOpen = ref(false)
const selfMode = ref<SelfMode>('without-self')
const selfItems = [
  { label: 'Exclude self-citations', value: 'without-self' },
  { label: 'Include self-citations', value: 'with-self' },
]
watch(analysis, (value) => {
  if (value && !value.modes.some((m) => m.selfMode === selfMode.value && m.ready)) {
    const available = value.modes.find((m) => m.ready)
    if (available) selfMode.value = available.selfMode
  }
})
const fileKind = (kind: string, mode: string) =>
  kind === 'publications'
    ? 'Documents'
    : kind === 'overview'
      ? selfLabel(mode).replace('Excluding all-author', 'Excl.').replace('Including', 'Incl.')
      : 'Not recognized'
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
  calculate()
}
function reset() {
  clear()
  pendingFiles.value = null
  reviewChoices.value = {}
  resolvedCount.value = 0
}
async function run() {
  calculate()
  await nextTick()
  const score = document.getElementById('score')
  if (score && score.getBoundingClientRect().top > innerHeight - 160) score.scrollIntoView()
}
const runId = ref(0)
watch(analysis, () => runId.value++)
const hasReady = computed(() => analysis.value?.modes.some((m) => m.ready) ?? false)
const scores = computed(() =>
  (['career', 'single-year'] as const).map((scope) => {
    const mode = analysis.value?.modes.find(
      (m) => m.scope === scope && m.selfMode === selfMode.value,
    )
    return {
      scope,
      label: scope === 'career' ? 'Career' : 'Single year',
      note: scope === 'career' ? 'Citations 1996–2025' : 'Citations in 2025',
      value: mode?.result?.cScore,
      parts: mode?.result ? metricNames.map((k) => ({ k, v: mode.result!.contributions[k] })) : [],
      state: !mode ? 'empty' : mode.result ? 'ready' : 'incomplete',
    }
  }),
)
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
  <div>
    <a href="#import" class="skip-link">Skip to file import</a>
    <div class="shell">
      <header class="site-header">
        <a href="#" class="brand">C-score calculator</a>
        <nav aria-label="Links">
          <a
            href="https://github.com/jksdfcoder/Top2_Cscore_calculator_scopus_based"
            target="_blank"
            rel="noopener noreferrer"
            >GitHub</a
          >
        </nav>
      </header>

      <main>
        <section class="hero" aria-labelledby="page-title">
          <h1 id="page-title">C-score, <em>calculated on your device.</em></h1>
          <div class="hero-grid">
            <ol id="import" class="steps">
              <li class="step" :class="{ done: files.length }">
                <div class="step-body">
                  <p class="step-title">Add your Scopus exports</p>
                  <UFileUpload
                    v-model="pendingFiles"
                    multiple
                    accept=".csv,text/csv"
                    icon="i-lucide-upload"
                    label="Drop CSV files here"
                    description="Documents + two Citation overviews · processed only in your browser"
                    :disabled="busy || !mounted"
                    class="file-drop"
                    :class="{ compact: files.length }"
                  />
                  <ul v-if="files.length" class="file-list" aria-label="Imported files">
                    <li v-for="f in files" :key="f.id">
                      <span class="file-name" :title="f.name">{{ f.name }}</span>
                      <span class="file-kind"
                        >{{ fileKind(f.kind, f.selfMode)
                        }}<template v-if="f.years.length">
                          · {{ Math.min(...f.years) }}–{{ Math.max(...f.years) }}</template
                        ></span
                      >
                      <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-x"
                        :aria-label="`Remove ${f.name}`"
                        @click="removeFile(f.id)"
                      />
                    </li>
                  </ul>
                  <div class="step-links">
                    <UButton variant="link" size="sm" class="p-0" @click="guideOpen = true"
                      >How to export three files from Scopus</UButton
                    >
                    <UButton
                      variant="link"
                      color="secondary"
                      size="sm"
                      class="p-0"
                      :disabled="busy || !mounted"
                      @click="loadDemo"
                      >Try a synthetic example</UButton
                    >
                    <UButton
                      v-if="busy && !files.length"
                      variant="link"
                      color="neutral"
                      size="sm"
                      class="p-0"
                      @click="reset"
                      >Cancel import</UButton
                    >
                  </div>
                </div>
              </li>
              <li class="step" :class="{ done: !!selectedAuthor }">
                <div class="step-body">
                  <p class="step-title">Confirm your Scopus Author ID</p>
                  <div class="author-row">
                    <USelectMenu
                      v-if="!manualAuthor"
                      v-model="selectedAuthor"
                      :items="authors"
                      value-key="value"
                      aria-label="Scopus Author ID"
                      placeholder="Appears after import"
                      :disabled="!files.length"
                    />
                    <UInput
                      v-else
                      v-model="selectedAuthor"
                      aria-label="Scopus Author ID"
                      placeholder="ID, or comma-separated IDs"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      :icon="manualAuthor ? 'i-lucide-list' : 'i-lucide-pencil'"
                      :aria-label="manualAuthor ? 'Choose an ID from the files' : 'Type an ID'"
                      @click="manualAuthor = !manualAuthor"
                    />
                  </div>
                </div>
              </li>
              <li class="step" :class="{ done: hasReady }">
                <div class="step-body">
                  <p class="step-title">Calculate</p>
                  <div class="author-row">
                    <UButton
                      size="lg"
                      block
                      :disabled="busy || !selectedAuthor || !files.length"
                      @click="run"
                      >Confirm author & calculate</UButton
                    >
                    <UButton
                      v-if="files.length"
                      color="neutral"
                      variant="ghost"
                      size="lg"
                      @click="reset"
                      >Clear all data</UButton
                    >
                  </div>
                  <p class="status-line">
                    <span role="status" aria-live="polite">{{ latestStatus }}</span>
                    <a v-if="issues.length" href="#review" class="attention">
                      <UIcon name="i-lucide-circle-alert" />
                      {{ groupedIssues.length }} to check</a
                    >
                  </p>
                  <UAlert v-if="error" color="error" variant="subtle" :description="error" />
                </div>
              </li>
            </ol>

            <section id="score" class="score-panel" aria-labelledby="score-heading">
              <div class="score-panel-head">
                <h2 id="score-heading">C-score</h2>
                <UTabs
                  v-model="selfMode"
                  :items="selfItems"
                  :content="false"
                  size="xs"
                  aria-label="Self-citation setting"
                />
              </div>
              <dl :key="runId" class="scores">
                <div v-for="s in scores" :key="s.scope" class="score">
                  <dt>{{ s.label }}</dt>
                  <dd>
                    <ol v-if="s.state === 'ready'" class="score-terms">
                      <li
                        v-for="(p, i) in s.parts"
                        :key="p.k"
                        :style="{ animationDelay: `${200 + i * 90}ms` }"
                      >
                        <UTooltip
                          :text="metricDescriptions[p.k]"
                          :delay-duration="200"
                          :ui="{
                            content: 'h-auto max-w-72 whitespace-normal',
                            text: 'whitespace-normal',
                          }"
                        >
                          <button
                            type="button"
                            class="score-term"
                            :aria-label="`${p.k}: ${metricLabels[p.k]}, normalized contribution ${p.v.toFixed(3)}`"
                          >
                            {{ p.k }} <b><ChangingNumber :value="p.v" /></b>
                            <i :style="{ width: `${p.v * 100}%` }" />
                          </button>
                          <template #content>
                            <div class="max-w-72 whitespace-normal">
                              <p>{{ metricDescriptions[p.k] }}</p>
                              <p class="mt-1 text-muted">
                                Shown here as a normalized c-score contribution.
                              </p>
                            </div>
                          </template>
                        </UTooltip>
                      </li>
                    </ol>
                    <span
                      class="score-value"
                      :class="{ empty: s.state === 'empty', incomplete: s.state === 'incomplete' }"
                      ><ChangingNumber
                        :value="s.state === 'ready' ? s.value : undefined"
                        :fallback="s.state === 'incomplete' ? 'Incomplete' : '—'"
                    /></span>
                    <span class="score-note">{{ s.note }}</span>
                  </dd>
                </div>
              </dl>
              <div class="score-foot">
                <span v-if="isDemo">Synthetic example · author ID 123</span>
                <span v-else>Calculated estimate · not an official result</span>
                <span class="score-links">
                  <a v-if="hasReady" href="#results">Indicators &amp; comparison ↓</a>
                  <UButton variant="link" size="xs" class="p-0" @click="methodOpen = true"
                    >Methodology</UButton
                  >
                </span>
              </div>
            </section>
          </div>
        </section>

        <section v-if="issues.length" id="review" class="chapter" aria-labelledby="review-heading">
          <div class="chapter-head">
            <h2 id="review-heading">Check your data</h2>
            <p>Missing values are never treated as zero. Resolve these, then calculate again.</p>
          </div>
          <div class="issue-list">
            <UAlert
              v-for="item in groupedIssues"
              :key="item.code"
              color="warning"
              variant="subtle"
              :title="item.message"
              :description="
                item.count > 1 ? `${item.count.toLocaleString()} affected records` : undefined
              "
            />
          </div>
          <div
            v-for="issue in reviewIssues.slice(0, reviewLimit)"
            :key="issue.decisionKey"
            class="match-review"
          >
            <p class="muted">
              {{ files.find((f) => f.id === issue.fileId)?.name }} · row {{ issue.row }}
            </p>
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
            class="mt-4"
            @click="reviewLimit += 20"
            >Show more records</UButton
          >
          <p v-if="resolvedCount" role="status" class="muted mt-4">
            {{ resolvedCount }} matching decisions applied.
          </p>
          <p
            v-if="groupedIssues.some((i) => /year|coverage|bucket/.test(i.code))"
            class="muted mt-4"
          >
            Earlier citation years are needed.
            <UButton variant="link" size="sm" class="p-0" @click="guideOpen = true"
              >See the early-window export.</UButton
            >
          </p>
        </section>

        <ResultsPanel
          v-if="analysis"
          v-model:self-mode="selfMode"
          :analysis="analysis"
          :files="files"
          :is-demo="isDemo"
        />
      </main>

      <ExportGuide v-model:open="guideOpen" />
      <UModal
        v-model:open="methodOpen"
        title="Methodology"
        description="Six indicators, one composite score."
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <div class="prose">
            <span class="formula">c = Σ ln(1 + indicator) / maxlog</span>
            <p>
              The indicators are total citations (NC), h-index (H), coauthorship-adjusted hm-index
              (Hm), and citations to papers as single (NCS), single or first (NCSF), and single,
              first or last author (NCSFL). Each maxlog is the largest value across all Scopus
              authors, so the formula is the same in every field. Field and subfield only choose
              what your score is compared with.
            </p>
            <p>
              Career uses citations received in 1996–2025; single year uses citations received in
              2025. Excluding self-citations removes any citation sharing an author with the cited
              paper.
            </p>
          </div>
        </template>
      </UModal>

      <footer class="site-footer">
        <div class="disclaimer">
          <div class="footer-overview">
            <p class="footer-description">
              A personal, open-source research project. Calculated estimates, not official
              Stanford/Elsevier results. Imported files stay in your browser.
            </p>
            <div class="footer-links">
              <p>
                <a
                  href="https://github.com/jksdfcoder/Top2_Cscore_calculator_scopus_based"
                  target="_blank"
                  rel="noopener noreferrer"
                  >GitHub</a
                >
                · Code:
                <a
                  href="https://github.com/jksdfcoder/Top2_Cscore_calculator_scopus_based/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  >MIT</a
                >
              </p>
              <p class="reference-licence">
                <a
                  href="https://doi.org/10.17632/btchxktzyw.9"
                  target="_blank"
                  rel="noopener noreferrer"
                  >V9 reference data</a
                >:
                <a
                  href="https://creativecommons.org/licenses/by-nc/3.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  >CC BY-NC 3.0</a
                >
              </p>
            </div>
          </div>
          <DataNotice>
            <h2>About this open-source tool</h2>
            <p>
              An independent, open-source c-score calculator, provided in a personal capacity for
              personal, non-commercial research and informational use.
              <a
                href="https://github.com/jksdfcoder/Top2_Cscore_calculator_scopus_based"
                target="_blank"
                rel="noopener noreferrer"
                >View the source on GitHub</a
              >. Independently developed and maintained by an individual, not on behalf of any
              university, employer or organization. Not affiliated with or endorsed by Stanford
              University or Elsevier.
            </p>
            <p>
              Results are calculated estimates from your exports, not official results or
              confirmation of Top 2% inclusion. The example uses synthetic data. Field and subfield
              are user-selected comparisons, not official classifications. Snapshot dates,
              incomplete inputs, record updates and implementation differences may affect accuracy.
              Do not use citation metrics alone for hiring, promotion or funding decisions.
            </p>
            <h2>Methodology and reference data</h2>
            <p>
              J. P. A. Ioannidis,
              <a
                href="https://doi.org/10.17632/btchxktzyw.9"
                target="_blank"
                rel="noopener noreferrer"
                >Updated science-wide author databases of standardized citation indicators, V9</a
              >. V9 uses the 1 August 2026 Scopus snapshot, with citations through 2025. Our
              independently implemented calculator uses its normalization parameters; reference
              values and author comparisons are extracted or transformed from the published dataset.
              <button type="button" class="footer-method" @click="methodOpen = true">
                Read our methodology</button
              >.
            </p>
            <h2>Privacy</h2>
            <p>
              This application does not upload, collect or persistently store your imported data.
              Files and calculations stay in your browser; downloads are created on your device. No
              analytics or tracking is included in the application. Hosting providers may process
              ordinary connection logs, such as IP addresses. Use only exports you are authorized to
              access and process under your Scopus subscription or applicable terms.
            </p>
            <h2>Licences</h2>
            <p>
              Application source code:
              <a
                href="https://github.com/jksdfcoder/Top2_Cscore_calculator_scopus_based/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                >MIT</a
              >. Official V9 reference data and its derivatives:
              <a
                href="https://creativecommons.org/licenses/by-nc/3.0/"
                target="_blank"
                rel="noopener noreferrer"
                >CC BY-NC 3.0</a
              >, attributed to J. P. A. Ioannidis, for non-commercial use under that licence. The
              code licence does not grant rights to third-party data or override their terms. Only
              import data you are authorized to use, and follow your institution’s subscription
              agreement and applicable data-provider terms, including the
              <a
                href="https://www.elsevier.com/legal/elsevier-website-terms-and-conditions/elsevier-scopus-terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                >Scopus terms</a
              >. Changes to the V9 reference data are documented in the repository. See
              <a
                href="https://github.com/jksdfcoder/Top2_Cscore_calculator_scopus_based/blob/main/THIRD_PARTY_NOTICES.md"
                target="_blank"
                rel="noopener noreferrer"
                >data attribution and third-party notices</a
              >. Provided “as is”, without warranty to the extent permitted by law. Verify results
              before relying on them.
            </p>
          </DataNotice>
        </div>
      </footer>
    </div>
  </div>
</template>
