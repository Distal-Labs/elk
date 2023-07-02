import type { mastodon } from 'masto'

interface FeedOptions {
  // Metadata attributes
  excludeDMs: boolean
  // Account attributes
  alwaysLargeAccounts: boolean
  excludeUnfamiliarAccounts: boolean
  excludeBots: boolean
  excludeLockedAccounts: boolean
  excludeNewAccounts: boolean
  // Content attributes
  onlyPreferredLanguage: boolean
  excludeBoosts: boolean
  excludeCrossposts: boolean
  excludeBirdsite: boolean
  excludeCWs: boolean
  excludeSexuallyExplicit: boolean
  excludeNSFW: boolean
  excludeReplies: boolean
  excludeThreads: boolean
  excludeMissingAltText: boolean
  // Hybrid
  excludeAltTextMinder: boolean
  excludeSpammers: boolean

  [key: string]: boolean
  [key: number]: boolean
}

type FeedTransformer<T> = (item: T) => boolean

type FeedTransform<T = mastodon.v1.Status> = {
  [Property in keyof FeedOptions]: FeedTransformer<T>;
}

type Feed<T> = Array<FeedTransformer<T>>

function getRelationships<T extends mastodon.v1.Status>(item: T) {
  if (!item.account || !item.account.acct)
    return false

  const rels = Array<mastodon.v1.Relationship>()
  useMastoClient().v1.accounts.fetchRelationships([item.account.id])
    .then(r => rels.concat(r))
    .catch((e) => {
      console.error((e as Error).message)
      return rels
    })
  return rels
}

function interactedWithContent<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.reblogged === true)
    || (item.favourited === true)
    || (item.bookmarked === true)
  )
}

function shouldNeverBeExcluded<T extends mastodon.v1.Status>(item: T) {
  return (
    (alwaysLargeAccounts(item))
    || interactedWithContent(item)
  )
}

function alwaysLargeAccounts<T extends mastodon.v1.Status>(item: T) {
  return (item.account.followersCount > 1500)
}

function excludeUnfamiliarAccounts<T extends mastodon.v1.Status>(item: T) {
  const rels = getRelationships(item)
  if (rels && rels.length === 1) {
    const r = rels[0]
    return (r.following || r.showingReblogs || r.notifying || r.requested || r.requestedBy || r.showingReblogs || r.endorsed) && (!r.muting || !r.mutingNotifications || !r.blockedBy || !r.blocking || !r.domainBlocking)
  }
  return false
}

function excludeBots<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.account.bot !== true)
  ) || interactedWithContent(item)
}

function excludeLockedAccounts<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.account.locked !== true)
  ) || interactedWithContent(item)
}

function excludeNewAccounts<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.account.followersCount > 49)
    && ((((Date.now() - Date.parse(item.account.createdAt))) / (86400000)) > 30)
  )
}

function excludeSpammers<T extends mastodon.v1.Status>(item: T) {
  if (
    ((item.account.statusesCount / Math.max(1, item.account.followersCount)) > 25)
    && item.account.followersCount < 10000
  )
    return false

  if ((item.account.statusesCount / Math.max(1, item.account.followersCount)) > 500)
    return false

  return (
    (item.account.username.search(/nuop|nu op|rubbercable/ig) === -1)
    && (item.account.followersCount > 50)
    && (item.account.statusesCount / ((((Date.now() - Date.parse(item.account.createdAt))) / (86400000)))) < 288
  ) || interactedWithContent(item)
}

const userLanguage = (useNavigatorLanguage().language.value ?? 'en-US').toLowerCase()

function onlyPreferredLanguage<T extends mastodon.v1.Status>(item: T) {
  if (!item.language)
    return true

  return (
    (userLanguage.includes(item.language.toLowerCase()))
  ) || alwaysLargeAccounts(item)
    || interactedWithContent(item)
}

function excludeBoosts<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.reblog === null) || (item.reblog === undefined)
  ) || shouldNeverBeExcluded(item)
}

function excludeCrossposts<T extends mastodon.v1.Status>(item: T) {
  if (!item.application)
    return true

  return (
    (item.application.name.search(/cross/ig) === -1)
  ) || shouldNeverBeExcluded(item)
}

function excludeBirdsite<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.content.search(/twitter.com[\/]|t.co[\/]/ig) === -1)
  ) || interactedWithContent(item)
}

function excludeCWs<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.sensitive !== true)
    && (!item.spoilerText)
  )
}

function excludeSexuallyExplicit<T extends mastodon.v1.Status>(item: T) {
  if (item.mediaAttachments.length === 0)
    return true

  return (
    (item.spoilerText ? (item.spoilerText.search(/nsfw|sensitive|nudity|sexy|porn/ig) === -1) : true)
    && (item.content.search(/nsfw|sensitive|nudity|sexy|porn|milf|fuck|gang.?bang|graphic|sex|creampie|anal|penetration|dp\b|dick|cock|balls|blow.?job|bj\b/ig) === -1)
    && !(item.account.acct === '110619164380237469' && item.account.acct.includes('mastodon.social')) // user does not flag their posts
  )
}

function excludeNSFW<T extends mastodon.v1.Status>(item: T) {
  return (
    excludeCWs(item)
    && excludeSexuallyExplicit(item)
  )
}

function excludeMissingAltText<T extends mastodon.v1.Status>(item: T) {
  if (item.mediaAttachments.length === 0)
    return true

  return (
    item.mediaAttachments.some(attachment => !attachment.description)
  )
}

function excludeReplies<T extends mastodon.v1.Status>(item: T) {
  if (!item.inReplyToId)
    return true
  // Comment to keep upstream linting preferences from messing this up
  if (!item.inReplyToAccountId)
    return true
  // Comment to keep upstream linting preferences from messing this up
  if (item.inReplyToAccountId && (item.inReplyToAccountId === item.account.id))
    return true
  // Comment to keep upstream linting preferences from messing this up
  return false
}

function excludeThreads<T extends mastodon.v1.Status>(item: T) {
  if (!item.inReplyToId)
    return true
  // Comment to keep upstream linting preferences from messing this up
  return !((item.inReplyToAccountId && (item.inReplyToAccountId === item.account.id)))
}

function excludeDMs<T extends mastodon.v1.Status>(item: T) {
  return (
    item.visibility !== 'direct'
  )
}

function excludeAltTextMinder<T extends mastodon.v1.Status>(item: T) {
  if (!item.inReplyToAccountId || (item.inReplyToAccountId && (item.inReplyToAccountId === item.account.id)))
    return true

  if (item.mediaAttachments.length === 0)
    return true

  return (
    (item.content.search(/alt.?text|screen.?readers?|assistive/ig) === -1)
  )
}

export function isProcessableItem<T extends mastodon.v1.Status>(item: T): boolean {
  if (!item.account || !item.account.acct)
    return false

  if (item.account.moved || item.account.suspended)
    return false

  if (!item.content)
    return false

  const server = getServerName(item.account)

  if (server === '')
    return false

  if (!isReachableDomain(server))
    return false

  return (
    (item.uri.search(/[\/]endpoints[\/]|[\/]notes[\/]|[\/]profiles[\/]|[\/]objects[\/]|[\/]calckey[\/]|gup.pe|group/ig) === -1)
  )
}

const availableTransforms: FeedTransform = {
  // Metadata attributes
  excludeDMs,
  // Account attributes
  alwaysLargeAccounts,
  excludeUnfamiliarAccounts,
  excludeBots,
  excludeLockedAccounts,
  excludeNewAccounts,
  // Content attributes
  onlyPreferredLanguage,
  excludeBoosts,
  excludeCrossposts,
  excludeBirdsite,
  excludeCWs,
  excludeSexuallyExplicit,
  excludeNSFW,
  excludeReplies,
  excludeThreads,
  excludeMissingAltText,
  // Hybrid
  excludeAltTextMinder,
  excludeSpammers,
}

function makeFeed<T extends mastodon.v1.Status>(steps: FeedOptions[]): Feed<T> {
  return steps.flatMap(step => Object.entries(step).filter(_ => _[1]).map(_ => availableTransforms[_[0]]))
}

function shouldBeInFeed<T extends mastodon.v1.Status>(item: T, feed: Feed<T>, onlyAccountIds: string[] = [], excludeAccountIds: string[] = [], exemptAccountIds: string[] = []): boolean {
  if (!isProcessableItem(item))
    return false

  if (excludeAccountIds.includes(item.account.id))
    return false
  else if ((onlyAccountIds.length > 0) && !onlyAccountIds.includes(item.account.id))
    return false
  else if (exemptAccountIds.includes(item.account.id))
    return true
  else
    return feed.every(_ => _(item))
}

const DEFAULT__CACHING_PREFERENCES: FeedOptions = {
  // Metadata attributes
  excludeDMs: false,
  // Account attributes
  alwaysLargeAccounts: false,
  excludeUnfamiliarAccounts: false,
  excludeBots: false,
  excludeLockedAccounts: false,
  excludeNewAccounts: true,
  // Content attributes
  onlyPreferredLanguage: false,
  excludeBoosts: false,
  excludeCrossposts: true,
  excludeBirdsite: true,
  excludeCWs: false,
  excludeSexuallyExplicit: true,
  excludeNSFW: false,
  excludeReplies: true,
  excludeThreads: false,
  excludeMissingAltText: false,
  excludeAltTextMinder: false,
  // Hybrid
  excludeSpammers: true,
}

const DEFAULT__ENRICHMENT_PREFERENCES: FeedOptions = {
  // Metadata attributes
  excludeDMs: true,
  // Account attributes
  alwaysLargeAccounts: false,
  excludeUnfamiliarAccounts: false,
  excludeBots: false,
  excludeLockedAccounts: true,
  excludeNewAccounts: true,
  // Content attributes
  onlyPreferredLanguage: false,
  excludeBoosts: false,
  excludeCrossposts: true,
  excludeBirdsite: true,
  excludeCWs: false,
  excludeSexuallyExplicit: true,
  excludeNSFW: false,
  excludeReplies: false,
  excludeThreads: false,
  excludeMissingAltText: false,
  excludeAltTextMinder: false,
  // Hybrid
  excludeSpammers: false,
}

const cachedFeed = makeFeed([DEFAULT__CACHING_PREFERENCES])
const enrichedFeed = makeFeed([DEFAULT__ENRICHMENT_PREFERENCES])

export function isCacheable<T extends mastodon.v1.Status>(item: T): boolean {
  return (isProcessableItem(item)) ? shouldBeInFeed(item, cachedFeed, [], []) : false
}

export function isEnrichable<T extends mastodon.v1.Status>(item: T): boolean {
  return (isProcessableItem(item)) ? shouldBeInFeed(item, enrichedFeed, [], []) : false
}

function contentIncludesQuestion<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.content.search(/[?]/ig) !== -1)
  )
}

function contentHasSealionPhrasing<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.content.search(/(how.*you|who.*you|what.*you|why.*you|have.*you|were.*you|do.*you|doesn't|don't|aren't|wouldn't|isn't|haven't|wasn't|weren't).*/ig) !== -1)
  )
}

function contentMentionsContentWarning<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.content.search(/\bcw|content warning|add.+warning/ig) !== -1)
  )
}

function contentMentionsHashtag<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.content.search(/\bhashtag|\btag|search.*tag\b|find.*tag\b/ig) !== -1)
  )
}

function contentIsVulgarOrCondescending<T extends mastodon.v1.Status>(item: T) {
  return (
    (item.content.search(/dumb|stupid|idiot|\bunpro\w+|you.+should|fuck|imbeci|stick to|bad take/ig) !== -1)
  )
}

export function useFeeds(relationships: mastodon.v1.Relationship[] = []) {
  const userSettings = useUserSettings()

  const experimentalAntagonistFilterLevel = userSettings.value?.preferences.experimentalAntagonistFilterLevel ?? 0

  const onlyAccountIds = relationships.filter(rel => (rel.followedBy || rel.following)).map(included => included.id)
  const excludeAccountIds = relationships.filter(rel => (rel.muting || rel.blocking || rel.domainBlocking || rel.blockedBy)).map(excluded => excluded.id)
  const exemptAccountIds = relationships.filter(rel => (rel.following)).map(included => included.id)

  function doesMeetReplySanityThreshold<T extends mastodon.v1.Status>(item: T): boolean {
    if (!isProcessableItem(item))
      return false

    if (!item.inReplyToAccountId || (item.inReplyToAccountId && (item.inReplyToAccountId === item.account.id)))
      return true

    if (exemptAccountIds.includes(item.account.id))
      return true

    switch (experimentalAntagonistFilterLevel) {
      case 5:
        if (!excludeUnfamiliarAccounts(item))
          return false
        // eslint-disable-next-line no-fallthrough
      case 4:
        if (contentIncludesQuestion(item))
          return false
        // eslint-disable-next-line no-fallthrough
      case 3:
        if (contentHasSealionPhrasing(item))
          return false
        // eslint-disable-next-line no-fallthrough
      case 2:
        if (contentMentionsContentWarning(item) || contentMentionsHashtag(item))
          return false
        // eslint-disable-next-line no-fallthrough
      case 1:
        if (contentIsVulgarOrCondescending(item))
          return false
        // eslint-disable-next-line no-fallthrough
      default:
        return true
    }
  }

  const DEFAULT__HOME_PREFERENCES: FeedOptions = {
    // Metadata attributes
    excludeDMs: userSettings.value?.preferences.excludeDMsInHome ?? true,
    // Account attributes
    alwaysLargeAccounts: false,
    excludeUnfamiliarAccounts: false,
    excludeBots: userSettings.value?.preferences.excludeBotsInHome ?? false,
    excludeLockedAccounts: false,
    excludeNewAccounts: false,
    // Content attributes
    onlyPreferredLanguage: false,
    excludeMissingAltText: userSettings.value?.preferences.excludeMissingAltTextInHome ?? false,
    excludeBoosts: userSettings.value?.preferences.excludeBoostsInHome ?? false,
    excludeCrossposts: userSettings.value?.preferences.excludeTwitterCrosspostsInHome ?? true,
    excludeBirdsite: userSettings.value?.preferences.excludeTwitterBacklinksInHome ?? true,
    excludeCWs: userSettings.value?.preferences.excludeCWsInHome ?? false,
    excludeSexuallyExplicit: userSettings.value?.preferences.excludeSexuallyExplicitInHome ?? true,
    excludeNSFW: false,
    excludeReplies: userSettings.value?.preferences.excludeNonThreadRepliesInHome ?? false,
    excludeThreads: userSettings.value?.preferences.excludeThreadRepliesInHome ?? true,
    // Hybrid
    excludeAltTextMinder: false,
    excludeSpammers: false,
  }

  const DEFAULT__CONVERSATION_PREFERENCES: FeedOptions = {
    // Metadata attributes
    excludeDMs: false,
    // Account attributes
    alwaysLargeAccounts: false,
    excludeUnfamiliarAccounts: userSettings.value?.preferences.excludeUnfamiliarAccountsInMessages ?? false,
    excludeBots: false,
    excludeLockedAccounts: false,
    excludeNewAccounts: false,
    // Content attributes
    onlyPreferredLanguage: false,
    excludeBoosts: false,
    excludeCrossposts: false,
    excludeBirdsite: false,
    excludeCWs: userSettings.value?.preferences.excludeCWsInMessages ?? false,
    excludeSexuallyExplicit: userSettings.value?.preferences.excludeSexuallyExplicitInMessages ?? true,
    excludeNSFW: false,
    excludeReplies: false,
    excludeThreads: false,
    excludeMissingAltText: false,
    // Hybrid
    excludeAltTextMinder: false,
    excludeSpammers: userSettings.value?.preferences.excludeSpammersInMessages ?? true,
  }

  const DEFAULT__NOTIFICATIONS_PREFERENCES: FeedOptions = {
    // Metadata attributes
    excludeDMs: userSettings.value?.preferences.excludeDMsInNotifications ?? true,
    // Account attributes
    alwaysLargeAccounts: false,
    excludeUnfamiliarAccounts: userSettings.value?.preferences.excludeMentionsFromUnfamiliarAccountsInNotifications ?? false,
    excludeBots: false,
    excludeLockedAccounts: false,
    excludeNewAccounts: false,
    // Content attributes
    onlyPreferredLanguage: false,
    excludeBoosts: userSettings.value?.preferences.excludeBoostsInNotifications ?? true,
    excludeCrossposts: false,
    excludeBirdsite: false,
    excludeCWs: false,
    excludeSexuallyExplicit: false,
    excludeNSFW: userSettings.value?.preferences.excludeNSFWInNotifications ?? false,
    excludeReplies: false,
    excludeThreads: false,
    excludeMissingAltText: userSettings.value?.preferences.excludeMissingAltTextInNotifications ?? true,
    // Hybrid
    excludeAltTextMinder: userSettings.value?.preferences.excludeAltTextMinderInNotifications ?? true,
    excludeSpammers: false, // ??userSettings.value?.preferences.excludeSpammersInNotifications ?? true,
  }

  const DEFAULT__THREAD_PREFERENCES: FeedOptions = {
    // Metadata attributes
    excludeDMs: false,
    // Account attributes
    alwaysLargeAccounts: false,
    excludeUnfamiliarAccounts: false,
    excludeBots: userSettings.value?.preferences.excludeBotsInThread ?? true,
    excludeLockedAccounts: false,
    excludeNewAccounts: userSettings.value?.preferences.excludeNewAccountsInThread ?? true,
    // Content attributes
    onlyPreferredLanguage: false,
    excludeBoosts: false,
    excludeCrossposts: false,
    excludeBirdsite: false,
    excludeCWs: userSettings.value?.preferences.excludeCWsInThread ?? false,
    excludeSexuallyExplicit: userSettings.value?.preferences.excludeSexuallyExplicitInThread ?? true,
    excludeNSFW: false,
    excludeReplies: false,
    excludeThreads: false,
    excludeMissingAltText: false,
    // Hybrid
    excludeAltTextMinder: userSettings.value?.preferences.excludeAltTextMinderInThread ?? true,
    excludeSpammers: false,
  }

  const DEFAULT__TREND_PREFERENCES: FeedOptions = {
    // Metadata attributes
    excludeDMs: true,
    // Account attributes
    alwaysLargeAccounts: true,
    excludeUnfamiliarAccounts: false,
    excludeBots: false,
    excludeLockedAccounts: true,
    excludeNewAccounts: false,
    // Content attributes
    onlyPreferredLanguage: false,
    excludeBoosts: true,
    excludeCrossposts: true,
    excludeBirdsite: true,
    excludeCWs: false,
    excludeSexuallyExplicit: false,
    excludeNSFW: true,
    excludeReplies: false,
    excludeThreads: false,
    excludeMissingAltText: true,
    // Hybrid
    excludeAltTextMinder: false,
    excludeSpammers: true,
  }

  const DEFAULT__GLOBAL_TIMELINE_PREFERENCES: FeedOptions = {
    // Metadata attributes
    excludeDMs: true,
    // Account attributes
    alwaysLargeAccounts: false,
    excludeUnfamiliarAccounts: false,
    excludeBots: userSettings.value?.preferences.excludeBotsInGlobal ?? true,
    excludeLockedAccounts: true,
    excludeNewAccounts: true,
    // Content attributes
    onlyPreferredLanguage: false,
    excludeBoosts: userSettings.value?.preferences.excludeBoostsInGlobal ?? false,
    excludeCrossposts: true,
    excludeBirdsite: true,
    excludeCWs: userSettings.value?.preferences.excludeCWsInGlobal ?? true,
    excludeSexuallyExplicit: userSettings.value?.preferences.excludeSexuallyExplicitInGlobal ?? true,
    excludeNSFW: false,
    excludeReplies: false,
    excludeThreads: userSettings.value?.preferences.excludeThreadRepliesInGlobal ?? true,
    excludeMissingAltText: userSettings.value?.preferences.excludeMissingAltTextInGlobal ?? false,
    // Hybrid
    excludeAltTextMinder: true,
    excludeSpammers: userSettings.value?.preferences.excludeSpammersInGlobal ?? true,
  }

  const homeFeed = makeFeed([DEFAULT__HOME_PREFERENCES])
  const notificationsFeed = makeFeed([DEFAULT__NOTIFICATIONS_PREFERENCES])
  const conversationFeed = makeFeed([DEFAULT__CONVERSATION_PREFERENCES])
  const threadFeed = makeFeed([DEFAULT__THREAD_PREFERENCES])
  const trendingFeed = makeFeed([DEFAULT__TREND_PREFERENCES])
  const globalFeed = makeFeed([DEFAULT__GLOBAL_TIMELINE_PREFERENCES])

  return {
    shouldBeInHome: (item: mastodon.v1.Status) => shouldBeInFeed(item, homeFeed, onlyAccountIds, excludeAccountIds),
    shouldBeInNotifications: (item: mastodon.v1.Notification) => {
      if (!currentUser.value)
        return false
      else if (item.status && (item.status.account.id !== currentUser.value.account.id))
        return shouldBeInFeed(item.status, notificationsFeed, onlyAccountIds, excludeAccountIds)
      else
        return true
    },
    shouldBeInConversations: (item: mastodon.v1.Conversation) => item.lastStatus && shouldBeInFeed(item.lastStatus, conversationFeed, onlyAccountIds, excludeAccountIds),
    shouldBeInThread: (item: mastodon.v1.Status) => shouldBeInFeed(item, threadFeed, onlyAccountIds, excludeAccountIds, exemptAccountIds),
    shouldBeInTrending: (item: mastodon.v1.Status) => shouldBeInFeed(item, trendingFeed, onlyAccountIds, excludeAccountIds),
    shouldBeInGlobal: (item: mastodon.v1.Status) => shouldBeInFeed(item, globalFeed, onlyAccountIds, excludeAccountIds),
    doesMeetReplySanityThreshold,
  }
}
