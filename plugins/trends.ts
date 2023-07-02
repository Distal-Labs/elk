import { initializeTrends } from '~/composables/trends'

export default defineNuxtPlugin(() => {
  onNuxtReady(async () => {
    initializeTrends(true).then(() => undefined).catch((e) => {
      if (process.dev)
        console.error('Trend initialization failed', (e as Error).message)
    })
  })
})
