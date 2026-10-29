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

function gapPhrase(gap: number) {
  const amount = Math.abs(gap).toFixed(3)
  return gap >= 0 ? `+${amount} above` : `${amount} below`
}

const chosen = computed(() => {
  const reference = data.value
  const name = subfieldName.value
  const fieldName = field.value
  if (!reference || !name || !fieldName) return null
  const career = reference.scopes.career.subfields.find(
    (item) => item.field === fieldName && item.name === name,
  )
  if (!career) return null
  const rows = props.analysis.modes.map((mode) => {
    const sub = reference.scopes[mode.scope].subfields.find(
      (item) => item.field === fieldName && item.name === name,
    )
    const result = mode.ready ? mode.result : undefined
    const placed =
      result && sub ? compare(result.cScore, reference, mode.scope, mode.selfMode, sub) : null
    const top2 = sub?.top2[mode.selfMode] ?? null
    return {
      label: `${scopeLabel(mode.scope)} · ${selfLabel(mode.selfMode)}`,
      score: result ? result.cScore.toFixed(3) : 'Incomplete',
      band: !result ? 'Incomplete' : (placed?.band ?? 'Not published for this mode'),
      top2: top2 === null ? 'Not published' : top2.toFixed(3),
      top2Gap: placed?.top2Gap == null ? null : gapPhrase(placed.top2Gap),
      top100k: reference.scopes[mode.scope].top100k[mode.selfMode].toFixed(3),
      top100kGap: placed ? gapPhrase(placed.top100kGap) : null,
    }
  })
  return { career, rows, license: reference.license, dataset: reference.dataset }
})
</script>

<template>
  <section
    id="comparison"
    class="page-section comparison-note"
    aria-labelledby="comparison-heading"
  >
    <h2 id="comparison-heading">Official field comparisons</h2>
    <div class="comparison-picks">
      <div class="comparison-pick-row">
        <UFormField label="Field">
          <USelectMenu
            v-model="field"
            :items="fieldNames"
            :disabled="!data"
            placeholder="Choose a field"
            aria-label="Field"
            class="w-full max-w-full overflow-hidden"
            :ui="{ value: 'min-w-0 flex-1', placeholder: 'min-w-0 flex-1' }"
          />
        </UFormField>
        <UFormField label="Subfield">
          <USelectMenu
            v-model="subfieldName"
            :items="subfieldNames"
            :disabled="!field"
            placeholder="Choose a subfield"
            aria-label="Subfield"
            class="w-full max-w-full overflow-hidden"
            :ui="{ value: 'min-w-0 flex-1', placeholder: 'min-w-0 flex-1' }"
          />
        </UFormField>
      </div>
    </div>
    <p v-if="!chosen">
      Choose a field, then a subfield, to compare your c-scores with official lines.
    </p>
    <template v-else>
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
              chosen.career.field
            }}
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
                <span v-if="row.top2Gap" class="block text-muted">{{ row.top2Gap }}</span>
              </td>
              <td>
                {{ row.top100k }}
                <span v-if="row.top100kGap" class="block text-muted">{{ row.top100kGap }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Among {{ chosen.career.authors.toLocaleString('en') }} Scopus authors with at least 5 papers
        whose primary subfield is {{ chosen.career.name }}.
      </p>
      <p>This comparison does not change your c-score.</p>
      <p>
        Choosing a subfield is not an official classification. The official primary subfield is the
        Science-Metrix subfield with the largest share of an author's papers.
      </p>
      <p>
        Official values are from the frozen 1 August 2026 Scopus snapshot, so a later export can
        differ.
      </p>
      <p>Passing a line is not confirmation of selection.</p>
      <p>
        Source:
        <a :href="chosen.dataset" target="_blank" rel="noopener noreferrer">V9 Tables 1–2</a>,
        {{ chosen.license }}
      </p>
    </template>
  </section>
</template>
