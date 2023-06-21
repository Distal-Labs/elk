import { initializeTrends } from '~/composables/trends'

export default defineNuxtPlugin(() => {
  onNuxtReady(() => {
    initializeTrends(false)
  })
})
