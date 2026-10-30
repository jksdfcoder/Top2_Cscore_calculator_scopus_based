const description =
  'Estimate career and single-year c-scores from your Scopus CSV exports. Local processing and exploratory V9 comparisons; not official rankings or Top 2% confirmation.'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-29',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  ui: { fonts: false, colorMode: false },
  icon: { provider: 'server', clientBundle: { scan: true } },
  app: {
    head: {
      title: 'C-score calculator · Independent estimates',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'referrer', content: 'no-referrer' },
        ...(process.env.NODE_ENV === 'production'
          ? [
              {
                'http-equiv': 'Content-Security-Policy',
                content:
                  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'",
              },
            ]
          : []),
        { name: 'description', content: description },
        { property: 'og:title', content: 'C-score calculator · Independent estimates' },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
      ],
    },
  },
  nitro: { preset: 'static' },
})
