<script setup lang="ts">
const items = [
  { label: 'How to export the three files from Scopus', slot: 'basic' },
  { label: 'My career data needs an earlier citation window', slot: 'early' },
  { label: 'What happens to my files?', slot: 'privacy' },
]
</script>

<template>
  <UAccordion :items="items" :unmount-on-hide="false">
    <template #basic>
      <div class="guide-copy">
        <p>
          You need access to Scopus exports through your own subscription or institution. No account
          or API key is needed on this site.
        </p>
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
            Drop all three CSV files below. Keep their original names and contents. The same files
            calculate both career and single-year impact.
          </li>
        </ol>
        <p class="text-muted">
          Instructions were checked against the Scopus interface on 29 October 2026. Export access
          and limits may change.
        </p>
      </div>
    </template>
    <template #early>
      <div class="guide-copy">
        <p>
          Career impact uses citations received in <strong>1996–2025</strong>. A nonzero “before
          2000” column cannot tell us which citations occurred before 1996.
        </p>
        <p>
          If the calculator requests earlier data, export an additional
          <strong>1996–2021</strong> Citation overview window for the affected self-citation
          setting. Keep zero-cited papers visible. Add the new CSV without removing your existing
          files.
        </p>
        <p>
          Scopus currently limits the visible window to 26 years. We combine explicit yearly columns
          and check overlapping counts. You do not need to join spreadsheets yourself.
        </p>
      </div>
    </template>
    <template #privacy>
      <div class="guide-copy">
        <p>
          Your CSV files are read and calculated in this browser. They are not uploaded, logged or
          saved in browser storage. Clear your data or close the page to remove the session.
          Refreshing the page also removes it.
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
