import type { mastodon } from 'masto'

export interface FeedOptions {
  // Account attributes
  alwaysLargeAccounts: boolean
  onlyFamiliarAccounts: boolean
  excludeBots: boolean
  excludeLockedAccounts: boolean
  excludeNewAccounts: boolean
  excludeSpammyAccounts: boolean
  // Content attributes
  onlyPreferredLanguage: boolean
  excludeBoosts: boolean
  excludeCrossposts: boolean
  excludeBirdsite: boolean
  excludeNSFW: boolean
  excludeReplies: boolean

  [key: string]: boolean
  [key: number]: boolean
}

type FeedTransformer<T> = (item: T) => boolean

export type FeedTransform<T = mastodon.v1.Status> = {
  [Property in keyof FeedOptions]: FeedTransformer<T>;
}

export type Feed<T> = Array<FeedTransformer<T>>

function getRelationships<T extends mastodon.v1.Status>(item: T) {
  const rels = Array<mastodon.v1.Relationship>()
  useMastoClient().v1.accounts.fetchRelationships([item.account.id])
    .then(r => rels.concat(r))
    .catch((e) => {
      console.error((e as Error).message)
      return rels
    })
  return rels
}

function shouldNeverBeExcluded<T extends mastodon.v1.Status>(item: T) {
  return (
    (alwaysLargeAccounts(item))
    || (item.reblogged === true)
    || (item.favourited === true)
    || (item.bookmarked === true)
  )
}

function alwaysLargeAccounts<T extends mastodon.v1.Status>(item: T) {
  return (item.account.followersCount > 1000)
}

function onlyFamiliarAccounts<T extends mastodon.v1.Status>(item: T) {
  const rels = getRelationships(item)
  if (rels && rels.length === 1) {
    const r = rels[0]
    return (r.following || r.showingReblogs || r.notifying || r.requested || r.requestedBy || r.showingReblogs || r.endorsed) && (!r.muting || !r.mutingNotifications || !r.blockedBy || !r.blocking || !r.domainBlocking)
  }
  return false
}

function excludeBots<T extends mastodon.v1.Status>(item: T) {
  return !(
    item.account.bot
  ) || !shouldNeverBeExcluded(item)
}

function excludeLockedAccounts<T extends mastodon.v1.Status>(item: T) {
  return !(
    item.account.locked
  ) || !shouldNeverBeExcluded(item)
}

function excludeNewAccounts<T extends mastodon.v1.Status>(item: T) {
  return !(
    (item.account.followersCount < 100)
    || ((((Date.now() - Date.parse(item.account.createdAt))) / (86400000)) < 30)
  ) || !shouldNeverBeExcluded(item)
}

function excludeSpammyAccounts<T extends mastodon.v1.Status>(item: T) {
  return !(
    (item.account.displayName.toLowerCase().includes('nuop') === true)
    || (item.account.statusesCount / ((((Date.now() - Date.parse(item.account.createdAt))) / (86400000)))) > 288
  ) || !shouldNeverBeExcluded(item)
}

const userLanguage = (useNavigatorLanguage().language.value ?? 'en-US').toLowerCase()

function onlyPreferredLanguage<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.language) ? (userLanguage.includes(item.language.toLowerCase())) : true
  ) || shouldNeverBeExcluded(item)
}

function excludeBoosts<T extends mastodon.v1.Status>(item: T) {
  return !(
    item.reblog
  ) || !shouldNeverBeExcluded(item)
}

function excludeCrossposts<T extends mastodon.v1.Status>(item: T) {
  return !(
    item.application?.name?.toLowerCase()?.includes('cross')
  ) || !shouldNeverBeExcluded(item)
}

function excludeBirdsite<T extends mastodon.v1.Status>(item: T) {
  return !(
    item.content?.toLowerCase()?.includes('twitter.com')
    || item.content?.toLowerCase()?.includes('t.co')
  ) || !shouldNeverBeExcluded(item)
}

function excludeNSFW<T extends mastodon.v1.Status>(item: T) {
  return !(
    (item.spoilerText?.toLowerCase()?.includes('nsfw'))
    || (item.spoilerText?.toLowerCase()?.includes('nudity'))
    || (item.content?.toLowerCase()?.includes('nsfw'))
    || (item.content?.toLowerCase()?.includes('porn'))
  ) || !shouldNeverBeExcluded(item)
}

function excludeReplies<T extends mastodon.v1.Status>(item: T) {
  return !(
    item.inReplyToAccountId
    && (item.inReplyToAccountId !== item.account.id)
  ) || !shouldNeverBeExcluded(item)
}

const availableTransforms: FeedTransform = {
  // Account attributes
  alwaysLargeAccounts,
  onlyFamiliarAccounts,
  excludeBots,
  excludeLockedAccounts,
  excludeNewAccounts,
  excludeSpammyAccounts,
  // Content attributes
  onlyPreferredLanguage,
  excludeBoosts,
  excludeCrossposts,
  excludeBirdsite,
  excludeNSFW,
  excludeReplies,
}

function makeFeed<T extends mastodon.v1.Status>(steps: FeedOptions[]): Feed<T> {
  return steps.flatMap(step => Object.entries(step).filter(_ => _[1]).map(_ => availableTransforms[_[0]]))
}

function shouldBeInFeed<T extends mastodon.v1.Status>(item: T, feed: Feed<T>): boolean {
  return feed.every(_ => _(item))
}

function applyFeed<T extends mastodon.v1.Status>(items: T[], feed: Feed<T>): T[] {
  return items.filter(item => feed.every(_ => _(item)))
}

const DEFAULT__PUBLIC_TIMELINE_PREFERENCES: FeedOptions = {
  // Account attributes
  alwaysLargeAccounts: false,
  onlyFamiliarAccounts: false,
  excludeBots: true,
  excludeLockedAccounts: true,
  excludeNewAccounts: true,
  excludeSpammyAccounts: true,
  // Content attributes
  onlyPreferredLanguage: false,
  excludeBoosts: true,
  excludeCrossposts: true,
  excludeBirdsite: true,
  excludeNSFW: true,
  excludeReplies: true,
}

const DEFAULT__CACHING_PREFERENCES: FeedOptions = {
  // Account attributes
  alwaysLargeAccounts: false,
  onlyFamiliarAccounts: false,
  excludeBots: true,
  excludeLockedAccounts: false,
  excludeNewAccounts: true,
  excludeSpammyAccounts: true,
  // Content attributes
  onlyPreferredLanguage: false,
  excludeBoosts: false,
  excludeCrossposts: true,
  excludeBirdsite: true,
  excludeNSFW: true,
  excludeReplies: true,
}

const DEFAULT__ENRICHMENT_PREFERENCES: FeedOptions = {
  // Account attributes
  alwaysLargeAccounts: false,
  onlyFamiliarAccounts: false,
  excludeBots: false,
  excludeLockedAccounts: true,
  excludeNewAccounts: true,
  excludeSpammyAccounts: true,
  // Content attributes
  onlyPreferredLanguage: false,
  excludeBoosts: false,
  excludeCrossposts: true,
  excludeBirdsite: true,
  excludeNSFW: true,
  excludeReplies: false,
}

const publicTimelineFeed = makeFeed([DEFAULT__PUBLIC_TIMELINE_PREFERENCES])
const cachedFeed = makeFeed([DEFAULT__CACHING_PREFERENCES])
const enrichedFeed = makeFeed([DEFAULT__ENRICHMENT_PREFERENCES])

export function useFeeds() {
  return {
    shouldBeInGlobal: (item: mastodon.v1.Status) => shouldBeInFeed(item, publicTimelineFeed),
    shouldBeCached: (item: mastodon.v1.Status) => shouldBeInFeed(item, cachedFeed),
    shouldBeEnriched: (item: mastodon.v1.Status) => shouldBeInFeed(item, enrichedFeed),
    applyPublicTimelineFeed: (items: mastodon.v1.Status[]) => applyFeed(items, publicTimelineFeed),
  }
}
