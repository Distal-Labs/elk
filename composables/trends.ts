import type { mastodon } from 'masto'
import { bulkFederatePosts, normalizeAndCacheTrendingTag } from './cache'
import { STORAGE_KEY_TRENDS } from '~/constants'
import { type FedifiedTrends } from '~/types'

const defaultTrends: FedifiedTrends = { posts: [], links: [], tags: [], timestamp: Date.now() }

const trendsStorage = useLocalStorage<FedifiedTrends | Partial<FedifiedTrends>>(STORAGE_KEY_TRENDS, defaultTrends, { deep: true })

const isPostUpdateInProgress = ref<boolean>(false)

const isTagUpdateInProgress = ref<boolean>(false)

const currentUserTrendingPosts = ref<mastodon.v1.Status[]>([])

const trendingPosts = computed({
  get: () => {
    if (currentUser.value)
      return currentUserTrendingPosts.value ?? []

    return trendsStorage.value.posts ?? []
  },
  set: (newValue) => {
    if (currentUser.value)
      currentUserTrendingPosts.value = newValue ?? []

    trendsStorage.value = {
      posts: newValue,
      tags: trendsStorage.value.tags,
      links: trendsStorage.value.links,
      timestamp: Date.now(),
    }
  },
})

const trendingTags = computed({
  get: () => {
    return trendsStorage.value.tags ?? []
  },
  set: (newValue) => {
    trendsStorage.value = {
      posts: trendsStorage.value.posts,
      tags: newValue,
      links: trendsStorage.value.links,
      timestamp: Date.now(),
    }
  },
})

const areCachedTrendsStale = computed(() => {
  if (!trendsStorage.value || !trendsStorage.value.timestamp)
    return true

  if (!currentUser.value && ((Date.now() - trendsStorage.value.timestamp) / 1000) > 3600) { // 1 hour for logged out visitors
    if (process.dev)
      console.warn('Trends are stale')
    return true
  }

  if (((Date.now() - trendsStorage.value.timestamp) / 1000) > 600) { // 10 minutes for logged in users
    if (process.dev)
      console.warn('Trends are stale')
    return true
  }
  return false
})

const featuredTagName = ref<string | null>(null)

// -0.01157407407, -0.005787037036, -0.002893518518, -0.001446759259, -0.0007233796295, -0.0003616898148, -0.0001808449074, -0.0000904224537
function sortPosts(a: mastodon.v1.Status, b: mastodon.v1.Status, sharedWeight = 4, likeWeight = 8, replyWeight = -1, decayWeight = -0.0001808449074) {
  // Penalizing for replies down-ranks ratio'ed posts to avoid mass dunking
  return (
    ((b.reblogsCount * sharedWeight) + (b.favouritesCount * likeWeight) + (b.repliesCount * replyWeight) + ((Date.now() - Date.parse(b.createdAt)) * decayWeight))
    - ((a.reblogsCount * sharedWeight) + (a.favouritesCount * likeWeight) + (a.repliesCount * replyWeight) + ((Date.now() - Date.parse(a.createdAt)) * decayWeight))
  )
}

async function fetchTrendingPosts(): Promise<void> {
  const reqPostsUrl = (!currentUser.value || process.dev) ? 'https://api.feditrends.com/?type=statuses&hours=24&order=pop' : 'https://discover.fedified.com/api/v1/trends/posts'

  const req = new Request(reqPostsUrl)
  req.headers.set('User-Agent', 'Mozilla/5.0 (compatible; Fedified Discover/1.0.0; +https://discover.fedified.com)')
  req.headers.set('Accept', 'application/json')
  req.headers.delete('Authorization')

  isPostUpdateInProgress.value = true
  const { data, error } = await useFetch<mastodon.v1.Status[]>(req, {
    watch: [currentUser],
    server: false,
    default: () => null,
  })

  if (error.value !== null) {
    if (process.dev)
      console.error(`Trending posts were not updated: ${error.value.message}`)

    isPostUpdateInProgress.value = false
    return
  }
  else if (data.value === null || data.value?.length === 0) {
    if (process.dev)
      console.warn('No trending posts were received from the server.')

    isPostUpdateInProgress.value = false
    return
  }

  if (!currentUser.value) {
    // If user is not logged in, then no need to federate data
    trendingPosts.value = data.value.map(post => normalizeAndCacheAuthoritativeStatus(post)).sort((a, b) => sortPosts(a, b)).slice(0, 40)
  }
  else {
    const federatedPosts = await bulkFederatePosts(data.value.map(_ => _.uri))
    trendingPosts.value = federatedPosts.sort((a, b) => sortPosts(a, b)).slice(0, 20)
  }

  isPostUpdateInProgress.value = false
}

function updateTrendingPosts(force: boolean): void {
  if (!currentUser.value) {
    if (process.dev)
      console.warn('Skipping Trending Posts update')
    return
  }

  if (trendingPosts.value.length > 0 && !force && !areCachedTrendsStale.value) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.info('Returning cached trending posts')
    return
  }

  fetchTrendingPosts().then(() => {
    if (process.dev) {
      // eslint-disable-next-line no-console
      console.info('Finished updating Trending Posts', trendingPosts.value)
    }
  }).catch ((e) => {
    if (process.dev)
      console.error(`Trending posts were not federated: ${(e as Error).message}`)
    isPostUpdateInProgress.value = false
  })
}

function computeTagUsage(tag: mastodon.v1.Tag, maxDay?: number, metric = 'posts') {
  if (!tag.history || tag.history.length === 0)
    return 0

  const sliceOfTagHistory: mastodon.v1.TagHistory[] = (!maxDay) ? tag.history : tag.history.slice(0, maxDay)

  return sliceOfTagHistory.reduce((total: number, item) => total + (Number(
    (metric === 'posts') ? item.uses : item.accounts,
  ) || 0), 0)
}

function formatTagUsage(usage: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(usage)
}

function sortTags(a: mastodon.v1.Tag, b: mastodon.v1.Tag) {
  return computeTagUsage(b) - computeTagUsage(a)
}

async function fetchTrendingTags(): Promise<void> {
  const source = (!currentUser.value || process.dev) ? 'feditrends' : 'fedified'

  const reqTagsUrl = (!currentUser.value || process.dev) ? 'https://api.feditrends.com/?type=tags&hours=24&order=pop' : 'https://discover.fedified.com/api/v1/trends/tags'

  const req = new Request(reqTagsUrl)
  req.headers.set('User-Agent', 'Mozilla/5.0 (compatible; Fedified Discover/1.0.0; +https://discover.fedified.com)')
  req.headers.set('Accept', 'application/json')
  req.headers.delete('Authorization')

  isTagUpdateInProgress.value = true

  const { data, error } = await useFetch<Array<{ tag: string; statuses: number; reblogs: number }> | Array<{ name: string; uses: number }> | Array<mastodon.v1.Tag>>(req, {
    watch: [currentUser],
    server: false,
    default: () => null,
  })

  if (data.value !== null && data.value.length > 0) {
    const cachedTags = Array<mastodon.v1.Tag>()
    for await (const tag of data.value.slice(0, 20)) {
      const aTag = await normalizeAndCacheTrendingTag(source, tag as unknown as { tag: string; statuses: number; reblogs: number } | { name: string; uses: number })
      cachedTags.push(aTag)
    }

    trendingTags.value = cachedTags.sort(sortTags)
    isTagUpdateInProgress.value = false
  }
  else if (error.value !== null) {
    if (process.dev)
      console.error(`Trending tags were not updated: ${error.value.message}`)

    isTagUpdateInProgress.value = false
  }
  else if (data.value === null || data.value?.length === 0) {
    if (process.dev)
      console.warn('No trending posts were received from the server.')

    isTagUpdateInProgress.value = false
  }
}

function updateTrendingTags(force: boolean): void {
  if (!currentUser.value) {
    if (process.dev)
      console.warn('Skipping Trending Tag update')
    return
  }

  if (trendingTags.value.length > 0 && !force && !areCachedTrendsStale.value) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.info('Returning cached trending tags')
    return
  }

  fetchTrendingTags().then(() => {
    if (process.dev) {
      // eslint-disable-next-line no-console
      console.info('Finished updating Trending Tags', trendingTags.value)
    }
  }).catch ((e) => {
    if (process.dev)
      console.error(`Trending Tags were not federated: ${(e as Error).message}`)
    isTagUpdateInProgress.value = false
  })
}

export async function initializeTrends(force = false) {
  if (force) {
    trendingPosts.value = []
    trendingTags.value = []
    fetchTrendingPosts()
    fetchTrendingTags()
    return
  }

  updateTrendingTags(force)
  updateTrendingPosts(force)
}

function selectFeaturedTag(tagName: string) {
  featuredTagName.value = tagName
}

export function useTrends() {
  return {
    trendSource: computed(() => (!currentUser.value || process.dev) ? 'feditrends' : 'fedified'),
    posts: trendingPosts,
    tags: trendingTags,
    updateTrendingPosts,
    updateTrendingTags,
    updateTrends: initializeTrends,
    isPostUpdateInProgress,
    isTagUpdateInProgress,
    formatTrendingTagLabel: (tag: mastodon.v1.Tag, maxDay?: number, metric = 'posts') => formatTagUsage(computeTagUsage(tag, maxDay, metric)),
    featuredTagName,
    selectFeaturedTag,
  }
}
