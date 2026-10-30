# Interface decisions

This is an Operate surface: a calm, minimal single page whose first screen is the whole task. Three numbered steps (add exports, confirm author, calculate) sit beside the score panel. On a desktop viewport of 1280×720 or larger, the import, identity, action and both scores are visible without scrolling. On narrow screens the steps stack above the score, and calculating scrolls the score into view.

Help lives where it is needed, as dialogs: "How to export three files from Scopus" sits in step 1 (steps visible, early-window and privacy notes folded), and "Methodology" sits in the score panel footer. Below the fold there are at most two chapters: data checks (only when there are issues), then one "Score and standing" module. Its Career / Single year tabs drive both halves. The radar labels axes with indicator values; You is gold, the compared listed author a dashed green outline, named in a fixed three-line legend that never changes height. The standing bar is the subfield rank on a log scale, rank 1 at the left: green is the official top 2% of ranks, white is everyone after, gold marks You (interpolated between listed authors, or between published percentiles with self-citations). Leader lines join You and Top 2% to their labels. A block in the bar picks a listed author following the WAI-ARIA slider pattern: it tracks the pointer 1:1 from the grab point and snaps to the nearest listed author, a track press jumps there, arrows step one author, and while dragging a readout and fine rank labels appear near the block. The empty state keeps the bar's height so switching field does not shift the page. Chapters fade and rise in with native CSS scroll-driven animation (`animation-timeline: view()`), gated by `@supports` and `prefers-reduced-motion: no-preference`. Content is fully visible without the animation. Do not add a scroll library. After each calculation the score panel plays one short sequence: formula, six contribution segments (each its share of the maximum 6), then the number; the top 2% band grows from rank 1 when a subfield is chosen. Toggling self-citations does not replay it, and reduced motion removes it.

Palette: light warm gray content column (`#f3f3f0`) on a barely deeper page edge (`#eeeeea`), near-white panels, deep forest green (`forest-700 #1f4d3c`) for primary actions and score numerals, and deep gold (`gold-700 #735423`) for the headline accent and secondary actions. These are Nuxt UI custom colors (`primary: forest`, `secondary: gold`, `neutral: stone`). Gold is never used for status alone, and lighter gold appears only on non-text chart fill. Text meets WCAG AA on the gray ground. Inline links inside text are underlined.

Use Nuxt UI controls and the system sans stack. Scores use tabular numerals: 3 decimals in the hero, 6 in the breakdown table. Only the score panel is a card. Do not add a sidebar, gradients, decorative cards or icons beside headings. Graphical data always has an equivalent table. Warnings name the missing input and the next action.

Short disclaimers sit where they matter: "Calculated estimate · not an official result" under the score, local processing in the drop zone, "does not confirm official inclusion" under the bar, and the full limitations, attribution and licences as unabridged small print in the page footer. Under each score, the calculation plays formula, then six labelled contributions (indicator, value, bar), then the total.


## Interpretation review — 30 October 2026

The approved reference-comparison refinement takes precedence over the earlier standing-bar copy.
Use “Explore V9 reference data” and “Comparison field/subfield”. Display author-level scope,
input/snapshot limitations and the distinction from research quality beside the score. Show
“Estimate” in the score heading and label synthetic examples explicitly. Classification and
non-inclusion warnings remain visible above the reference graph. Historical listed-author ranks
are labelled V9; never display an interpolated personal integer rank. Interpolate illustrative
positions only between available reference points (published percentile points with self-citations,
sampled listed-author points without); do not extrapolate to first place or invent a zero endpoint.
Show percentile bands only with self-citations and explicitly explain their absence without.
The derived top-2% threshold is a historical benchmark, not an eligibility decision. Methods
explain both official selection routes and incomplete verification of the V9 production pipeline.


## Portrait refinement — 30 October 2026

Narrow layouts prioritize the import task and then the two score values, followed by their six
contributions. A completed stacked calculation (including demo) scrolls the score into view.
Self-citation tabs show concise Exclude/Include text alongside a Self-citations label, while
retaining full accessible names. Essential scope, data-quality, non-official and research-quality
limits remain visible in short sentences. Technical interpolation details are expandable.
The comparison controls precede the radar in DOM order. A named results container pairs the two
regions only above 48rem of available width; wide layout places the radar to the left. A nested
comparison container pairs the field selectors above 28rem, otherwise they stack. Score columns
wrap when their minimum readable width no longer fits, including larger user text. Touch controls
have 44px minimum height; the reference track permits vertical page panning and horizontal dragging.
