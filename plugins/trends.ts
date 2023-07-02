import { initializeTrends } from '~/composables/trends'

export default defineNuxtPlugin(() => {
  onNuxtReady(async () => {
    await initializeTrends(true)
  })
})
