import type { mastodon } from 'masto'
import { STORAGE_KEY_TRENDS } from '~/constants'
import { type FedifiedTrends } from '~/types'

const defaultTrends: FedifiedTrends = { posts: [], links: [], tags: [], timestamp: Date.now() }

const trendsStorage = useLocalStorage<FedifiedTrends>(STORAGE_KEY_TRENDS, defaultTrends, { deep: true })

const trendSource = computed(() => (!currentUser.value || process.dev) ? 'feditrends' : 'fedified')

const reqPostsUrl: string = (trendSource.value === 'feditrends') ? 'https://api.feditrends.com/?type=statuses&hours=24&order=pop' : 'https://discover.fedified.com/api/v1/trends/posts'

const isPostUpdateInProgress = ref<boolean>(false)
// -0.01157407407, -0.005787037036, -0.002893518518, -0.001446759259, -0.0007233796295, -0.0003616898148, -0.0001808449074, -0.0000904224537
function sortPosts(a: mastodon.v1.Status, b: mastodon.v1.Status, sharedWeight = 4, likeWeight = 8, replyWeight = -1, decayWeight = -0.0001808449074) {
  // Penalizing for replies down-ranks ratio'ed posts to avoid mass dunking
  return (
    ((b.reblogsCount * sharedWeight) + (b.favouritesCount * likeWeight) + (b.repliesCount * replyWeight) + ((Date.now() - Date.parse(b.createdAt)) * decayWeight))
    - ((a.reblogsCount * sharedWeight) + (a.favouritesCount * likeWeight) + (a.repliesCount * replyWeight) + ((Date.now() - Date.parse(a.createdAt)) * decayWeight))
  )
}

function getTrendingCache(): FedifiedTrends {
  return trendsStorage.value
}

async function federateTrendingPosts(remotePost: mastodon.v1.Status) {
  const acct = `${remotePost.account.username}@${remotePost.account.url.replace('https://', '').split('/')[0]}`
  remotePost.account.acct = acct
  return await fetchStatus(remotePost.uri, false, true)
}

async function refreshTrendingPosts(force: boolean): Promise<mastodon.v1.Status[]> {
  const trendingPosts = reactive(getTrendingCache().posts)
  if (trendingPosts && (trendingPosts.length > 0) && !force)
    return trendingPosts

  const req = new Request(reqPostsUrl)
  req.headers.set('User-Agent', 'Mozilla/5.0 (compatible; Fedified Discover/1.0.0; +https://discover.fedified.com)')
  req.headers.set('Accept', 'application/json')
  req.headers.delete('Authorization')

  const { data, pending, error } = await useFetch<mastodon.v1.Status[]>(req)

  if (data.value !== null) {
    const sorted = changeKeysToCamelCase(data.value.slice(0, 40)).sort((a, b) => sortPosts(a, b))

    // If user is not logged in, then just return the raw values
    if (!currentUser.value)
      return sorted.slice(0, 40)

    const results = Array<mastodon.v1.Status>()
    await Promise.allSettled(sorted.slice(0, 40)
      .map(async (trendingPost) => {
        try {
          const federatedTrendingPost = await federateTrendingPosts(trendingPost)
          if (federatedTrendingPost)
            results.push(federatedTrendingPost)
        }
        catch (e) {
          console.error((e as Error).message)
        }
      }))
    Object.assign(trendingPosts, results.filter(_ => _ !== undefined))
    return results.sort((a, b) => sortPosts(a, b))
  }
  console.error(`Trending posts were not updated | Pending?: ${pending.value} | Error?: ${error.value?.message}`)
  return trendingPosts.sort((a, b) => sortPosts(a, b))
}

async function updateTrendingPosts(force: boolean): Promise<void> {
  // if (!currentUser.value) return;

  if (isPostUpdateInProgress.value) {
    console.warn('Ignoring: trending post update is already in progress.')
    return
  }
  isPostUpdateInProgress.value = true
  try {
    const posts = await refreshTrendingPosts(force)
    trendsStorage.value.posts = posts.sort((a, b) => sortPosts(a, b))
    trendsStorage.value.timestamp = Date.now()
    isPostUpdateInProgress.value = false
  }
  catch (e) {
    console.error(`Unable to fetch trending posts: ${(e as Error).message}`)
    isPostUpdateInProgress.value = false
  }
}

export async function initializeTrends() {
  // trendsStorage.value = defaultTrends
  return await refreshTrendingPosts()
}

export async function retrieveOrRefreshTrends() {
  // if (Date.now() > (getTrendingCache().timestamp + 3600 * 1000)) { // 1 hr
  //   console.warn('Resetting trends because the cache has expired')
  //   trendsStorage.value = defaultTrends
  // }

  // if (trendsUserStorage.value !== userHandle) {
  //   console.warn('Resetting trending posts because the active user has changed')
  //   trendsStorage.value.posts = defaultTrends.posts
  // }

  const posts = await refreshTrendingPosts()
  trendsStorage.value.posts = posts.sort((a, b) => sortPosts(a, b))
  trendsStorage.value.timestamp = Date.now()
  return trendsStorage.value
}

async function refresh() {
  await retrieveOrRefreshTrends()
}

export function useTrends() {
  const t = reactive(getTrendingCache())
  return {
    posts: t.posts.sort((a, b) => sortPosts(a, b)),
    trendSource,
    refresh,
  }
}
