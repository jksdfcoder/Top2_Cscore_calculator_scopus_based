<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const items = [
  { label: 'My career data needs an earlier citation window', slot: 'early' },
  { label: 'What happens to my files?', slot: 'privacy' },
]
</script>

<template>
  <UModal
    v-model:open="open"
    title="Export three files from Scopus"
    description="One Documents export and two Citation overviews."
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <!-- ponytail: the recorded walkthrough GIF goes here as an <img> with alt text, above the steps. -->
      <div class="prose">
        <ol>
          <li>
            Open <strong>Authors</strong>, search for yourself and check your author profile. Under
            Documents, choose <strong>Export all → CSV</strong>. The Export CSV button on author
            search results exports a different file.
          </li>
          <li>
            Keep <strong>Citation information</strong> selected and add
            <strong>Serial identifiers (e.g. ISSN)</strong>. Turn
            <strong>Truncate to optimize for Excel</strong> off, then export.
          </li>
          <li>
            Return to your profile and open <strong>Citation overview</strong>. Select a window
            containing 2025, such as 2000–2025. Turn
            <strong>Hide documents with 0 citations</strong> off. Leave citation exclusions off and
            export.
          </li>
          <li>
            In <strong>Exclude citations</strong>, select
            <strong>Exclude self citations of all authors</strong>, then export again. “Selected
            author” is a different definition.
          </li>
          <li>
            Drop all three CSV files into step 1, keeping their original names and contents. The
            same files calculate both career and single-year impact.
          </li>
        </ol>
        <p class="muted">
          You need Scopus access through your own subscription or institution. Checked against the
          Scopus interface on 29 October 2026.
        </p>
      </div>
      <UAccordion :items="items" class="mt-4">
        <template #early>
          <div class="prose pb-4">
            <p>
              Career impact uses citations received in <strong>1996–2025</strong>. A nonzero “before
              2000” column cannot tell us which citations occurred before 1996.
            </p>
            <p>
              If the calculator requests earlier data, export an additional
              <strong>1996–2021</strong> Citation overview window for the affected self-citation
              setting. Keep zero-cited papers visible. Add the new CSV without removing your
              existing files.
            </p>
            <p>
              Scopus currently limits the visible window to 26 years. We combine explicit yearly
              columns and check overlapping counts. You do not need to join spreadsheets yourself.
            </p>
          </div>
        </template>
        <template #privacy>
          <div class="prose pb-4">
            <p>
              Your CSV files are read and calculated in this browser. They are not uploaded, logged
              or saved in browser storage. Clear your data, refresh or close the page to remove the
              session.
            </p>
            <p>
              Downloads are created on your device. Audit reports contain input fingerprints and
              calculated values, but not publication titles or author IDs. The hosting provider may
              still record ordinary page requests.
            </p>
          </div>
        </template>
      </UAccordion>
    </template>
  </UModal>
</template>
