export default defineNuxtConfig({
  compatibilityDate: '2026-10-29',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  ui: { fonts: false, colorMode: false },
  icon: { provider: 'server', clientBundle: { scan: true } },
  app: {
    head: {
      title: 'C-score calculator · Scopus data, explained',
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
        {
          name: 'description',
          content:
            'Calculate career and single-year citation impact from your own Scopus CSV exports. Transparent methods. Files stay on your device.',
        },
      ],
    },
  },
  nitro: { preset: 'static' },
})
