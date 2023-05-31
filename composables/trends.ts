import type { mastodon } from 'masto'
import { STORAGE_KEY_TRENDS, STORAGE_KEY_TRENDS_CURRENT_USER } from '~/constants'
import { type FedifiedTrends } from '~/types'

const defaultTrends: FedifiedTrends = { posts: [], links: [], tags: [], timestamp: Date.now() }

const userHandle = $computed(() => (currentUser.value) ? `${currentUser.value.account.acct}` : null)
const trendsStorage = useLocalStorage<FedifiedTrends>(STORAGE_KEY_TRENDS, defaultTrends, { deep: true })
const trendsUserStorage = useLocalStorage<string | null>(STORAGE_KEY_TRENDS_CURRENT_USER, userHandle, { deep: true })

const trendSource = computed(() => (!currentUser.value || process.dev) ? 'feditrends' : 'fedified')

const reqUrl: string = (trendSource.value === 'feditrends') ? 'https://api.feditrends.com/?hours=1&order=pop' : 'https://discover.fedified.com/api/v1/trends/posts'

function changeKeysToCamelCase<T>(d: T): T {
  function transformCase(s: string) {
    return s.replaceAll(/_\w/g, (substring: string) => substring.replace('_', '').toUpperCase())
  }
  function _transformKeys(data: any, transform: (s: string) => string): any {
    if (Array.isArray(data))
      return data.map(value => transformKeys(value, transform))

    if (data instanceof Object) {
      return Object.fromEntries(Object.entries(data).map(([key, value]) => [
        transform(key),
        transformKeys(value, transform),
      ]))
    }
    return data
  }

  function transformKeys(data: any, transform: (s: string) => string): any {
    const f = (key: string) => {
      // `PATCH /v1/preferences` uses `:` as a delimiter
      if (key.includes(':'))
        return key
      // `PATCH /v2/filters` uses _destroy as a special key
      if (key.startsWith('_'))
        return key
      return transform(key)
    }
    return _transformKeys(data, f)
  }
  return transformKeys(d, transformCase)
}

function sortPosts(a: mastodon.v1.Status, b: mastodon.v1.Status, sharedWeight = 3, likeWeight = 2, replyWeight = -0.5) {
  // Penalizing for replies down-ranks ratio'ed posts to avoid mass dunking
  return ((b.reblogsCount * sharedWeight) + (b.favouritesCount * likeWeight) + (b.repliesCount * replyWeight)) - ((a.reblogsCount * sharedWeight) + (a.favouritesCount * likeWeight) + (a.repliesCount * replyWeight))
}

function getTrendingCache(): FedifiedTrends {
  return trendsStorage.value
}

async function federateTrendingPosts(remotePost: mastodon.v1.Status) {
  if (currentUser.value) {
    const { client } = useMasto()
    const results = (await client.value.v2.search({ q: remotePost.uri, type: 'statuses', resolve: true })).statuses
    if (results.length === 0)
      return undefined
    const federatedPost = results[0]
    federatedPost.favouritesCount = remotePost.favouritesCount
    federatedPost.reblogsCount = remotePost.reblogsCount
    return federatedPost
  }
  return remotePost
}

async function refreshTrendingPosts(): Promise<mastodon.v1.Status[]> {
  const trendingPosts = reactive(getTrendingCache().posts)

  const req = new Request(reqUrl)
  req.headers.set('User-Agent', 'Mozilla/5.0 (compatible; Fedified Discover/1.0.0; +https://discover.fedified.com)')
  req.headers.set('Accept', 'application/json')
  req.headers.delete('Authorization')

  const { data, pending, error } = await useFetch<mastodon.v1.Status[]>(req)

  if (data.value !== null) {
    const results = Array<mastodon.v1.Status>()
    await Promise.allSettled(changeKeysToCamelCase(data.value)
      .sort((a, b) => sortPosts(a, b)).slice(0, 20)
      .map(async (trendingPost) => {
        const federatedTrendingPost = await federateTrendingPosts(trendingPost)
        if (federatedTrendingPost)
          results.push(federatedTrendingPost)
      }))
    Object.assign(trendingPosts, results.filter(_ => _ !== undefined))
    return results
  }
  console.error(`Trending posts were not updated | Pending?: ${pending.value} | Error?: ${error.value?.message}`)
  return trendingPosts
}

export async function initializeTrends() {
  trendsStorage.value = defaultTrends
  return await refreshTrendingPosts()
}

export async function retrieveOrRefreshTrends() {
  if (Date.now() > (getTrendingCache().timestamp + 3600 * 1000)) { // 1 hr
    console.warn('Resetting trends because the cache has expired')
    trendsStorage.value = defaultTrends
  }

  if (trendsUserStorage.value !== userHandle) {
    console.warn('Resetting trending posts because the active user has changed')
    trendsStorage.value.posts = defaultTrends.posts
  }

  const posts = await refreshTrendingPosts()
  trendsStorage.value.posts = posts
  trendsStorage.value.timestamp = Date.now()
  return trendsStorage.value
}

async function refresh() {
  await retrieveOrRefreshTrends()
}

export function useTrends() {
  const t = reactive(getTrendingCache())
  return {
    posts: t.posts,
    trendSource,
    refresh,
  }
}
