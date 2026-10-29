<script setup lang="ts">
import { compare, type ComparisonData } from '~/lib/cscore/compare'
import type { Analysis } from '~/lib/cscore/contracts'
import { scopeLabel, selfLabel } from '~/lib/reference'

const props = defineProps<{ analysis: Analysis }>()
const data = ref<ComparisonData | null>(null)
const field = ref<string>()
const subfieldName = ref<string>()

onMounted(async () => {
  data.value = (await import('../../public/reference/v9/comparison.json')).default
})
watch(field, () => {
  subfieldName.value = undefined
})

const fieldNames = computed(() => data.value?.scopes.career.fields.map((item) => item.name) ?? [])
const subfieldNames = computed(
  () =>
    data.value?.scopes.career.subfields
      .filter((item) => item.field === field.value)
      .map((item) => item.name) ?? [],
)

function gap(value: number) {
  return { text: `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(3)}`, above: value >= 0 }
}

const chosen = computed(() => {
  const reference = data.value
  const name = subfieldName.value
  if (!reference || !name || !field.value) return null
  const career = reference.scopes.career.subfields.find(
    (item) => item.field === field.value && item.name === name,
  )
  if (!career) return null
  const rows = props.analysis.modes.map((mode) => {
    const sub = reference.scopes[mode.scope].subfields.find((item) => item.name === name)
    const result = mode.ready ? mode.result : undefined
    const placed =
      result && sub ? compare(result.cScore, reference, mode.scope, mode.selfMode, sub) : null
    const top2 = sub?.top2[mode.selfMode] ?? null
    return {
      label: `${scopeLabel(mode.scope)} · ${selfLabel(mode.selfMode)}`,
      score: result ? result.cScore.toFixed(3) : 'Incomplete',
      band: !result ? '—' : (placed?.band ?? 'Not published for this mode'),
      top2: top2 === null ? 'Not published' : top2.toFixed(3),
      top2Gap: placed?.top2Gap == null ? null : gap(placed.top2Gap),
      top100k: reference.scopes[mode.scope].top100k[mode.selfMode].toFixed(3),
      top100kGap: placed ? gap(placed.top100kGap) : null,
    }
  })
  return { career, rows, license: reference.license, dataset: reference.dataset }
})
</script>

<template>
  <section id="comparison" class="chapter reveal" aria-labelledby="comparison-heading">
    <div class="chapter-head">
      <h2 id="comparison-heading">Where you stand.</h2>
      <p>Compare with official V9 subfield percentiles and selection lines.</p>
    </div>
    <div class="chapter-body">
      <div class="pick-row">
        <UFormField label="Field">
          <USelectMenu
            v-model="field"
            :items="fieldNames"
            :disabled="!data"
            placeholder="Choose a field"
            aria-label="Field"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Subfield">
          <USelectMenu
            v-model="subfieldName"
            :items="subfieldNames"
            :disabled="!field"
            placeholder="Choose a subfield"
            aria-label="Subfield"
            class="w-full"
          />
        </UFormField>
      </div>
      <template v-if="chosen">
        <div
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Official subfield comparison"
        >
          <table class="metric-table">
            <caption>
              {{
                chosen.career.name
              }}
              ·
              {{
                chosen.career.authors.toLocaleString('en')
              }}
              authors with ≥5 papers
            </caption>
            <thead>
              <tr>
                <th scope="col">Mode</th>
                <th scope="col">Your c-score</th>
                <th scope="col">Position among all authors in subfield</th>
                <th scope="col">Subfield top 2% line</th>
                <th scope="col">Global top 100,000 line</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in chosen.rows" :key="row.label">
                <th scope="row">{{ row.label }}</th>
                <td>{{ row.score }}</td>
                <td class="band">{{ row.band }}</td>
                <td>
                  {{ row.top2 }}
                  <span v-if="row.top2Gap" class="sub" :class="{ above: row.top2Gap.above }">{{
                    row.top2Gap.text
                  }}</span>
                </td>
                <td>
                  {{ row.top100k }}
                  <span
                    v-if="row.top100kGap"
                    class="sub"
                    :class="{ above: row.top100kGap.above }"
                    >{{ row.top100kGap.text }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="fine-print">
          Comparison only — your c-score does not change. Your chosen subfield is not an official
          classification (that is the subfield with most of your papers). Official values use the
          frozen 1 August 2026 Scopus snapshot; crossing a line does not confirm selection. Source:
          <a :href="chosen.dataset" target="_blank" rel="noopener noreferrer">V9 Tables 1–2</a>,
          {{ chosen.license }}.
        </p>
      </template>
    </div>
  </section>
</template>
