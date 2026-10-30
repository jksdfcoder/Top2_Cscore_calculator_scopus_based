# C-score calculator

## Platform
Web, static single page. This is a task interface for researchers using their own Scopus exports.

## Ownership

A personal open-source project maintained independently by jksdfcoder, not on behalf of any university, employer or organization. Source attribution and comparison-author affiliations do not indicate project ownership.

## Confirmed requirements
Users import files once and calculate career and single-year c-scores, both with and without all-author self-citations when supplied. Processing remains on their device. No scraping, institutional API, login or remote storage. The user explicitly chose one page, restrained layout, and reuse of existing components. Nuxt 4 and Nuxt UI 4 are the agreed starting stack.

## This implementation slice
A working local-file calculator with tested parsing, matching, date coverage, four-mode calculations, recovery and audit download. Full official author cohort comparison, extra real-author validation and finished tutorial videos belong to the next slice and must be reported as incomplete.

## Audience
Researchers worldwide, including authors absent from the public Top 2% list. Scopus export access is a prerequisite for real inputs; the synthetic demo works without an account.

## Language
English interface, with Chinese handoff and tutorial notes. This follows the approved plan.
