# Data-use boundaries and GitHub Pages

Reviewed 2026-10-29 against the published sources linked below. This records the implementation and remaining permissions questions; it is not written authorization from Elsevier or a legal determination that every user's use is permitted.

## What the product actually does

- Runs the calculation in the browser, with no login, institutional API key, Scopus scraper, AI service, raw-file upload, persistent browser storage, advertising or payment flow.
- Bundles reference values and selected author comparisons derived from the publicly released V9 tables. These are not newly scraped Scopus profiles.
- Distributes synthetic CSV examples. Private research exports and authenticated Scopus screenshots remain outside the repository and deployment artifact.
- Identifies itself as an independent project, not an official service or endorsement, and labels personal scores as estimates. The code licence and data licence are presented separately.

## Permission boundaries

1. **Official public reference data.** [V9](https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/9) explicitly carries CC BY-NC 3.0. Its [legal terms](https://creativecommons.org/licenses/by-nc/3.0/legalcode) permit qualifying non-commercial copying and adaptation subject to attribution, licence notices and other conditions. We identify Ioannidis, V9 and its DOI, link the licence, indicate extraction/transformation, retain notices, and do not imply endorsement. MIT applies to independently written application code, not the source data. Free access alone is not a universal determination of non-commercial use; advertising, paid services, sponsorship or other commercial advantage require reassessment before being added.
2. **Users' Scopus exports.** The public V9 licence is not a licence for an arbitrary Scopus CSV. [Elsevier's service terms](https://www.elsevier.com/legal/elsevier-website-terms-and-conditions) contain restrictions on redistribution, systematic retrieval and certain AI uses, with exceptions depending on applicable licences, subscriptions or authorization. The app does not obtain an account or retrieve data for the user, and does not redistribute their files, but local processing alone does not establish every user's contractual permission. Institutional subscription terms have not been reviewed. Published test results should remain aggregate; raw exports must not be uploaded to issues or public fixtures.
3. **Development/research use.** The deployed calculator is deterministic TypeScript, not an AI analysis service. This distinction does not by itself settle permissions for separate development activities involving AI-assisted examination of Scopus material. Those activities remain subject to the relevant subscription/authorization and terms; no general permission is claimed here.
4. **Privacy and hosting.** The application does not send imported data to the host. GitHub still serves the website and may process connection information under its [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Do not promise that no party collects any information. Avoid asking users to attach real files in public support channels.

These design choices reduce specific risks; they cannot guarantee no objection, takedown request or legal claim. If certainty about a disputed use is required, obtain written permission addressing that use rather than relying on a disclaimer. Recheck permissions before commercialization or adding retrieval, remote storage or AI processing.

## Deployment

The workflow `.github/workflows/ci.yml` tests the app, then generates a second static build for the Pages base path, uploads **only `.output/public`** with `actions/upload-pages-artifact`, and deploys it with `actions/deploy-pages`. Generated output is not committed to main. Pull requests verify but do not deploy; main pushes and manual runs on main deploy only after verification succeeds.

Pages Settings must use **GitHub Actions**. The current project URL is:

https://jksdfcoder.github.io/Top2_Cscore_calculator_scopus_based/

Nuxt's `NUXT_APP_BASE_URL` is populated from `configure-pages` so both repository subpaths and a future configured custom domain are supported. Demo and peer-data fetches use this base URL, rather than the domain root. Root and project-path builds are both tested.

GitHub Pages does not apply the repository's nginx configuration. Production HTML therefore includes a Content-Security-Policy meta element restricting resource/data connections to self and required local data/blob assets, plus a no-referrer meta policy. Meta CSP cannot provide every header-only protection (for example frame-ancestors). It complements the absence of upload code; it is not proof of legal compliance or complete data isolation. No custom nginx headers are claimed for the Pages deployment.

The deployed artifact includes the application MIT licence, third-party notices, and the reference-data licence. Future pushes to main update the live app automatically after the checks pass. The GitHub repository interface continues showing its README; the github.io URL is the actual calculator.
