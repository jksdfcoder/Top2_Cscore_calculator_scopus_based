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
