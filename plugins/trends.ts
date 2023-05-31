import { initializeTrends } from '~/composables/trends'
import { STORAGE_KEY_TRENDS } from '~/constants'
import { type FedifiedTrends } from '~/types'

export default defineNuxtPlugin(() => {
  onNuxtReady(async () => {
    const posts = await initializeTrends()
    const trends: FedifiedTrends = {
      posts,
      links: [],
      tags: [],
      timestamp: Date.now(),
    }
    useLocalStorage<FedifiedTrends>(STORAGE_KEY_TRENDS, trends, { deep: true })
  })
})
