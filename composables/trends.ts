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

const reqTagsUrl: string = (trendSource.value === 'feditrends') ? 'https://api.feditrends.com/?type=tags&hours=12&order=pop' : 'https://discover.fedified.com/api/v1/trends/tags'

const isTagUpdateInProgress = ref<boolean>(false)

const featuredTagName = ref<string | null>(null)

interface TagUsage { name: string; uses: number; tag?: string; statuses?: number; reblogs?: number }

function sortTags(a: Partial<TagUsage>, b: Partial<TagUsage>) {
  if (trendSource.value === 'feditrends')
    return (((b.reblogs ?? 0) + (b.statuses ?? 0)) - ((a.reblogs ?? 0) + (a.statuses ?? 0)))

  return ((b.uses ?? 0) - (a.uses ?? 0))
}

async function federateAndCacheTrendingTags(tagUsage: Partial<TagUsage>) {
  if (!currentUser.value)
    return null

  const tagName = tagUsage.name ?? tagUsage.tag
  if (tagName) {
    const { client } = useMasto()
    const results = (await client.value.v2.search({ q: tagName, type: 'hashtags', resolve: false })).hashtags
    if (results.length === 0)
      return undefined
    const federatedTag = results[0]
    if (federatedTag.history && federatedTag.history.length > 0) {
      federatedTag.history.sort((a, b) => (Number(b.day ?? '0') - Number(a.day ?? '0')))[0].uses = String(tagUsage.uses ?? ((tagUsage.reblogs ?? 0) + (tagUsage.statuses ?? 0)))
      return federatedTag
    }
  }
}

async function refreshTrendingTags(force: boolean): Promise<mastodon.v1.Tag[]> {
  if (!currentUser.value)
    return []

  const trendingTags = reactive(getTrendingCache().tags)
  if (trendingTags && (trendingTags.length > 0) && !force)
    return trendingTags

  const req = new Request(reqTagsUrl)
  req.headers.set('User-Agent', 'Mozilla/5.0 (compatible; Fedified Discover/1.0.0; +https://discover.fedified.com)')
  req.headers.set('Accept', 'application/json')
  req.headers.delete('Authorization')

  const { data, pending, error } = await useFetch<Partial<TagUsage>[]>(req)

  const results = Array<mastodon.v1.Tag>()
  if (data.value !== null) {
    const sorted = data.value.sort((a, b) => sortTags(a, b))
    await Promise.allSettled(sorted.slice(0, 40)
      .map(async (trendingTag) => {
        try {
          const federatedTrendingTag = await federateAndCacheTrendingTags(trendingTag)
          if (federatedTrendingTag)
            results.push(federatedTrendingTag)
        }
        catch (e) {
          console.error((e as Error).message)
        }
      }))
    Object.assign(trendingTags, results.filter(_ => _ !== undefined))
    return results.sort((a, b) => sortTags(a, b))
  }
  console.error(`Trending tags were not updated | Pending?: ${pending.value} | Error?: ${error.value?.message}`)
  return trendingTags.sort((a, b) => sortTags(a, b))
}

async function updateTrendingTags(force: boolean): Promise<void> {
  // if (!currentUser.value) return;

  if (isTagUpdateInProgress.value)
    return

  isTagUpdateInProgress.value = true
  featuredTagName.value = null
  try {
    const tags = await refreshTrendingTags(force)
    const sortedTags = tags.sort((a, b) => sortTags(a, b))
    trendsStorage.value.tags = sortedTags
    trendsStorage.value.timestamp = Date.now()

    if (sortedTags.length > 0)
      featuredTagName.value = sortedTags[0].name

    isTagUpdateInProgress.value = false
  }
  catch (e) {
    console.error(`Unable to fetch trending tags: ${(e as Error).message}`)
    isTagUpdateInProgress.value = false
  }
}

async function retrieveOrRefreshTrends(force: boolean) {
  // if (Date.now() > (getTrendingCache().timestamp + 3600 * 1000)) { // 1 hr
  //   console.warn('Resetting trends because the cache has expired')
  //   trendsStorage.value = defaultTrends
  // }

  // if (trendsUserStorage.value !== userHandle) {
  //   console.warn('Resetting trending posts because the active user has changed')
  //   trendsStorage.value.posts = defaultTrends.posts
  // }
  await updateTrendingTags(force)
  await updateTrendingPosts(force)
}

export async function initializeTrends() {
  await retrieveOrRefreshTrends(true)
}

function selectFeaturedTag(tagName: string) {
  featuredTagName.value = tagName
}

export function useTrends() {
  const currentTrendingPosts = computed(() => (getTrendingCache().posts.length > 0) ? getTrendingCache().posts.sort((a, b) => sortPosts(a, b)) : [])
  const currentTrendingTags = computed(() => (getTrendingCache().tags.length > 0) ? getTrendingCache().tags.sort((a, b) => sortTags(a, b)) : [])
  return {
    posts: currentTrendingPosts,
    tags: currentTrendingTags,
    trendSource,
    updateTrendingTags,
    updateTrendingPosts,
    isPostUpdateInProgress,
    isTagUpdateInProgress,
    featuredTagName,
    selectFeaturedTag,
  }
}
