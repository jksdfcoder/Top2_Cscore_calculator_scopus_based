# Interface decisions

This is an Operate surface: a calm, minimal single page whose first screen is the whole task. Three numbered steps (add exports, confirm author, calculate) sit beside the score panel. On a desktop viewport of 1280×720 or larger, the import, identity, action and both scores are visible without scrolling. On narrow screens the steps stack above the score, and calculating scrolls the score into view.

Everything that is not the act of getting a score lives below the fold as full-width chapters, in this order: data checks (only when there are issues), indicator breakdown, official comparison, export guide, method. Each chapter opens with one large headline and one short line. Chapters fade and rise in with native CSS scroll-driven animation (`animation-timeline: view()`), gated by `@supports` and `prefers-reduced-motion: no-preference`. Content is fully visible without the animation. Do not add a scroll library.

Palette: light warm gray ground (`#f3f3f0`), near-white panels, deep forest green (`forest-700 #1f4d3c`) for primary actions and score numerals, and deep gold (`gold-700 #735423`) for the headline accent and secondary actions. These are Nuxt UI custom colors (`primary: forest`, `secondary: gold`, `neutral: stone`). Gold is never used for status alone, and lighter gold appears only on non-text chart fill. Text meets WCAG AA on the gray ground. Inline links inside text are underlined.

Use Nuxt UI controls and the system sans stack. Scores use tabular numerals: 3 decimals in the hero, 6 in the breakdown table. Only the score panel is a card. Do not add a sidebar, gradients, decorative cards or icons beside headings. Graphical data always has an equivalent table. Warnings name the missing input and the next action.
