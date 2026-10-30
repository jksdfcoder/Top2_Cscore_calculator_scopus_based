# Security best-practices review

Date: 30 October 2026. Reviewed application commit: `0fa4b48`.

## Executive summary

No critical/high-severity vulnerability, imported-record upload path, persisted private-data store, or exploitable CSV-to-script path was found in the reviewed scope. Five findings remain: two medium-priority CSP hardening gaps and three low-priority hosting/dependency/build-chain gaps. The medium findings weaken defence in depth; neither is proof that an attacker can currently inject content or steal imported files.

This review adds live deployment inspection and adversarial rendering tests to the earlier privacy review. It is not a penetration-test certification, a legal-compliance opinion, or an anonymity guarantee. Application and hosting fixes have not been applied in this review.

## Skill and method

Used OpenAI's [security-best-practices skill](https://github.com/openai/skills/tree/main/skills/.curated/security-best-practices), installed locally for this review. Relevant guidance: `javascript-typescript-vue-web-frontend-security.md` and `javascript-general-web-frontend-security.md`. The upstream main revision observed during the review was `49f948faa9258a0c61caceaf225e179651397431`.

The stack is Vue/TypeScript with Nuxt static generation, Nuxt UI, Papa Parse and ECharts. GitHub Pages serves static output; there is no production Nuxt application server, authentication backend, database or upload API. The optional Docker image serves the same static output through nginx. Backend authentication, SQL injection and cookie-authenticated CSRF rules therefore do not apply to the current architecture.

Reviewed build/deployment entrypoints, client configuration, CSV parsing and matching, text rendering, navigation, reference fetches, downloads, storage and cancellation. Retrieved the live calculator's HTML and HTTP response headers with read-only HTTPS requests. Ran production-dependency audit and browser security tests using synthetic inputs only. No authenticated Scopus session or private exports were used.

## Medium-priority findings

### 001 — CSP meta follows script elements in the generated page

- **Rule:** JS-CSP-001.
- **Location:** `nuxt.config.ts:12–22`, generated HTML head, and the live Pages response.
- **Evidence:** CSP is configured as an `app.head.meta` entry. Live document order was: inline script → same-origin module script → CSP meta → later scripts. The live response supplied no `Content-Security-Policy` HTTP header.
- **Impact:** A meta policy cannot retroactively govern content before it. The intended whole-document policy is therefore incomplete. An attacker would still need an independent injection, asset compromise or deployment compromise; no such imported-data path was demonstrated.
- **Fix:** Ensure generation places the policy before all script/resource elements and verify the final HTML order in CI. Prefer a response-header CSP when hosting allows it.
- **Mitigation:** Maintain escaped text rendering and bundled assets. The current policy still protects subsequent content.
- **False-positive/context notes:** A preceding module element need not execute before the parser reaches the meta; nevertheless the policy should not rely on execution timing. This is a configuration gap, not evidence that every earlier script is malicious or unsafe. The Docker HTML response already has a header policy, so this ordering gap primarily affects Pages.

### 002 — Script policy permits arbitrary inline JavaScript

- **Rule:** JS-CSP-002 / VUE-HEADERS-001.
- **Location:** `nuxt.config.ts:19`; `nginx.conf:8–9`.
- **Evidence:** `script-src 'self' 'unsafe-inline'` is used in both policies. nginx documents Nuxt's inline configuration as the reason. No `unsafe-eval` is enabled.
- **Impact:** If a separate HTML-injection flaw is introduced, inline script/event-handler payloads receive less protection from CSP. Current CSV rendering remained inert in the adversarial tests.
- **Fix:** Authorize necessary generated executable inline scripts using build-time hashes and remove script `unsafe-inline`, or use supported Nuxt CSP facilities after verifying static-generation compatibility. Update both meta and nginx policies consistently.
- **Mitigation:** Preserve Vue escaping and avoid raw HTML, dynamic templates and string-to-code APIs.
- **False-positive/context notes:** A per-request nonce is not automatically appropriate for static Pages. Do not remove `unsafe-inline` without accounting for actual generated executable scripts and checking all calculation modes. Style `unsafe-inline` has a separate compatibility/risk analysis and is not the primary finding.

## Low-priority findings

### 003 — Live Pages document lacks anti-framing headers

- **Rule:** VUE-HEADERS-001.
- **Location:** Pages publication in `.github/workflows/ci.yml:63–82`; contrast `nginx.conf:9`.
- **Evidence:** Live HTTPS response had neither `X-Frame-Options` nor a header CSP with `frame-ancestors`. The meta policy cannot implement `frame-ancestors`.
- **Impact:** Another site may frame the calculator and misrepresent its context or overlay deceptive controls. This does not let a cross-origin parent read selected files or child DOM; no privileged remote transaction exists here.
- **Fix:** If anti-framing is required, use hosting or an edge capable of setting `Content-Security-Policy: frame-ancestors 'none'` (or an intentional allowlist).
- **Mitigation:** Keep user-facing personal-project attribution and direct site links. The Docker deployment already sends `frame-ancestors 'none'` on HTML.
- **False-positive/context notes:** This is a hosting limitation, not an absent nginx setting. Do not add an ineffective meta directive or treat JavaScript frame-busting as equivalent to a response header. No live hostile framing exploit was attempted.

### 004 — Production dependency graph contains low-severity advisories

- **Rule:** VUE-SUPPLY-001.
- **Location:** `package-lock.json` dependency graph; `package.json` dependencies/overrides.
- **Evidence:** Fresh `npm audit --omit=dev --json`: 8 low entries, 0 moderate, 0 high, 0 critical. Entries include transitive paths, not eight independent exploitable browser bugs. Root advisories include [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) and [esbuild Windows development-server file access](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr).
- **Impact:** Vulnerable tooling remains in the installation/build graph. No route from imported browser CSVs to the affected deepmerge API was found. The published static website does not expose an esbuild Windows development server.
- **Fix:** Apply compatible patched resolutions after inspecting their dependency paths, and rerun build/type/browser checks. Where no compatible patch exists, document applicability and track the upstream fix.
- **Mitigation:** Keep development servers private and deploy only generated static files.
- **False-positive/context notes:** npm's suggested forced Nuxt downgrade is not a safe automatic remediation. `--omit=dev` does not imply every reported package runs in the published browser application.

### 005 — CI does not continuously check advisories or immutably pin Actions

- **Rule:** VUE-SUPPLY-001 / JS-SUPPLY-001, extended to the build boundary.
- **Location:** `.github/workflows/ci.yml:22–32,65,82`.
- **Evidence:** Actions are referenced by major-version tags, such as `actions/checkout@v4` and `actions/deploy-pages@v4`; no audit or dependency-review step is present. npm uses committed lockfiles and `npm ci`.
- **Impact:** New advisories may not be caught by normal verification, and action tags are less immutable than full commit SHAs. Upstream action compromise could affect a build or deployment. No compromised action or account was identified.
- **Fix:** Pin verified Action commits and automate reviewed updates; add dependency advisory monitoring with a documented severity threshold and separate tracking of accepted low findings.
- **Mitigation:** Retain job-level least privilege and existing PR deployment restrictions. Current PR jobs do not receive the deploy job's Pages write/id-token permissions.
- **False-positive/context notes:** These are official GitHub Actions, not arbitrary untrusted actions. Using version tags is a hardening gap, not proof of a supply-chain attack. Whether branch protection or account MFA is enabled was not audited.

## Verified controls and negative findings

- `app/composables/useAnalysis.ts:37–65`: browser `File.text()`, local parsing and SHA-256; no raw-file request body.
- Network code retrieves synthetic demo files and public reference JSON. No analytics, remote error logger, credentialed API, arbitrary redirect or `postMessage` handler was found.
- `app/lib/cscore/match.ts:50–58` can carry imported titles into issue messages; these are rendered as escaped text. The adversarial test exercises this error path as well as an HTML-looking filename.
- `app/lib/cscore/report.ts:2–47`: reports exclude raw papers, filenames and author identifiers; CSV cells use fixed labels/numbers. Reports still contain aggregates/hashes and should not be called anonymous.
- `app/components/ResultsPanel.vue:250–269`: local Blob download with URL revocation.
- Clear and generation checks drop application references and suppress stale async results. This is not secure memory erasure.
- No `v-html`, application HTML-insertion sink, string-to-code evaluation, client secret, runtime remote script URL or browser persistence API was found in application source.
- Public source attribution and comparison authors' institutions are not project ownership. Historical Git metadata remains traceable, as already documented in `SECURITY.md`.

## Validation

- New `tests/e2e/security.spec.ts` checks a synthetic SVG event-handler payload in citation titles and an image/event-handler filename: displayed as text, no payload marker, no inserted handler-bearing nodes, no injected image request.
- Four browser projects passed the new rendering test: Chromium, Firefox, WebKit and mobile Chromium.
- The privacy/storage/clear test was rerun alongside the new test across all four projects: 8 tests passed.
- Live HTTP status was 200 over HTTPS. Meta CSP was present; header CSP, `X-Frame-Options` and `X-Content-Type-Options` were not observed. Header absence was checked directly, not inferred from repository files.

## Limits and order of work

Prioritize 001 and 002 together, then dependency/CI hardening. Finding 003 requires a hosting decision if strict anti-framing is desired; moving away from Pages is not necessary merely to establish that CSV processing is local.

This was a focused source/runtime-configuration review, not exhaustive dependency source analysis, browser-extension inspection, hosting-account audit or fuzzing campaign. Parser/matcher work runs on the main thread with a 30 MB per-file limit and no total import budget (`useAnalysis.ts:44–59`, `match.ts:13–25`); large imports may affect local responsiveness. This is a known local availability/performance boundary, not a demonstrated remote service-denial attack. No production exploit attempt, raw-data upload or Git-history rewrite was performed.

Primary platform references: [MDN CSP guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [Vue security guidance](https://vuejs.org/guide/best-practices/security).
