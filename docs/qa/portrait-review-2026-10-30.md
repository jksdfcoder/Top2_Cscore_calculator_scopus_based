# Portrait layout review — 30 October 2026

## Findings

The prior layout fit without horizontal overflow but made portrait users read a long introduction,
small component values ahead of the score, and a radar before reaching comparison controls.
Long field names were truncated by paired selectors. Repeated interpretation paragraphs competed
with the numeric result. The reference track disabled vertical touch scrolling.

## Changes

- Short task introduction, compact upload guidance and a Choose CSV files action suitable for touch.
- Main score values precede the six component values. A completed stacked calculation, including
  the synthetic demo, brings the result into view. The score remains the main visual focus.
- Compact self-citation control with a visible Self-citations label and Exclude/Include buttons.
  Full accessible names remain Exclude/Include self-citations; primary controls are at least 44px high.
- Scope, profile/export/date accuracy and research-quality limits remain visible in concise form.
- Comparison controls and reference band precede the radar in DOM order. Named container queries
  pair the regions when the results box is wide enough and stack them when it is narrow.
- Nested container queries stack the field selectors until their own box can fit both. Score columns
  wrap when needed rather than overflowing under small widths or larger text settings.
- Non-official classification/rank/inclusion and illustrative-position warnings stay visible.
  Expanded technical interpolation explanations remain available through native details/summary.
- Vertical touch panning across the reference track does not select an author. Horizontal touch
  dragging and tapping retain comparison selection. Mouse and keyboard selection remain supported.

## Verification and boundaries

Inspected rendered empty, score and comparison states at 390×844 and the wide comparison at
1280×900 with Ego Browser. Playwright verifies 320, 390, 430, 768 and 1024px widths, a narrow
container inside a wide viewport, 20px root text, score-first ordering, comparison-before-radar,
visible key limits, touch target height and no horizontal overflow.

Chromium CDP synthesized touch events verify vertical scroll without selection and horizontal
selection changes, in desktop-Chromium and mobile-Chromium contexts. Firefox and WebKit run the
layout, accessibility, keyboard and existing interaction journeys. This is emulation and browser
engine testing, not physical iPhone/Android validation.

The estimator methodology, citation windows, reference data, eligibility limits and local-data
processing boundaries are unchanged. This refinement does not establish official classification,
ranking, selection or complete V9 production parity.

## Copy review — 30 October 2026

Public-facing wording pass after the portrait refinement: hero reads "C-score, on this page."; the
comparison header names the published V9 dataset and says "citations through 2025" (the career
scope is not 2025-only); the rank caveat and drag hint appear only once a bar is shown; the export
guide says "Add" rather than "Drop" to match the touch action; the always-visible footer summary
adds the hiring/promotion/funding caution; link previews get Open Graph title and description.
