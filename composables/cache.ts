import { LRUCache } from 'lru-cache'
import type { mastodon } from 'masto'
import { useFeeds } from './discovery/feeds'

const { shouldBeEnriched } = useFeeds()

// expire in an hour
const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 3600000,
  ttlAutopurge: true,
  allowStaleOnFetchAbort: true,
  allowStaleOnFetchRejection: true,
  allowStale: true,
  noUpdateTTL: true,
  ttlResolution: 60000,
})

if (process.dev && process.client)
  // eslint-disable-next-line no-console
  console.log({ cache })

function setCached(key: string, value: any, override = false) {
  if (override || !cache.has(key))
    cache.set(key, value)
}
function removeCached(key: string) {
  cache.delete(key)
}

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

export function extractAccountWebfinger(webfingerOrUriOrUrl: string) {
  if (webfingerOrUriOrUrl.includes('/tags/'))
    return null

  const preNormalized = webfingerOrUriOrUrl.replace('https://', '').replace(`/${currentServer.value}/@`, '')
  if (preNormalized.replace(/^@+/i, '').search(/^[\w]+@[a-z0-9][\w\.]+\.[a-z]+$/ig) === 0)
    return preNormalized.replace(/^@+/i, '')

  const normalizedValue = preNormalized.replace('https://', '')
    .replace('/users/', '/@')
    .replace('/u/', '/@')
    .replace('@@', '@')
    .replace(/^@+/i, '')
    .replace(/\/statuses\/[0-9a-z\/]+$/ig, '')

  if (normalizedValue.includes('/@')) {
    const splitValue = normalizedValue.split('/@')
    return `${splitValue[1]}@${splitValue[0]}`
  }
  else if (
    !normalizedValue.includes('/')
    && !normalizedValue.startsWith('@')
    && normalizedValue.includes('@')
    && normalizedValue.indexOf('@') === normalizedValue.lastIndexOf('@')
  ) {
    return normalizedValue
  }
  else if (normalizedValue.search(/^[a-z0-9_]{1,30}$/i) === 0) {
    // see https://github.com/mastodon/mastodon/blob/25c66fa640962a4d54d59a3f53516ab6dcb1dae6/app/models/concerns/omniauthable.rb#L95
    return normalizedValue
  }
  else {
    if (process.dev)
      console.warn(`Malformed account URI or URL: ${webfingerOrUriOrUrl}`)
    return null
  }
}

function generateAccountWebfingerCacheKeyAccessibleToCurrentUser(webfingerOrUriOrUrl: string) {
  const normalizedValue = extractAccountWebfinger(webfingerOrUriOrUrl)
  if (!normalizedValue)
    return null
  return `${currentServer.value}:${currentUser.value?.account.id}:account:${normalizedValue}`
}

function generateAccountIdCacheKey(accountId: string) {
  return `${currentServer.value}:${currentUser.value?.account.id}:account:${accountId}`
}

function generateAuthoritativeStatusCacheKey(uri: string) {
  return `${currentServer.value}:status:${uri}`
}

function generateTrendCacheKey(source: string, kind: string, label: string) {
  return `${currentServer.value}:trend:${source}:${kind}:${label}`
}

function generateStatusIdCacheKeyAccessibleToCurrentUser(statusId: string) {
  return `${currentServer.value}:${currentUser.value?.account.id}:status:${statusId}`
}

function generateNotificationIdCacheKey(notificationId: string) {
  return `${currentServer.value}:${currentUser.value?.account?.id}:notification:${notificationId}`
}

async function federateRemoteStatus(statusUri: string, force = false): Promise<mastodon.v1.Status | null> {
  if (cache.has(`stop:${statusUri}`)) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.debug(`Skipping further processing for invalid status URI: ${statusUri}`)
    return Promise.resolve(null)
  }

  if (statusUri.startsWith(`https://${currentServer.value}`)) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.info(`Local domain is authoritative, so redirecting resolution request for status: ${statusUri}`)

    return fetchStatus(statusUri.split('/').pop() ?? statusUri.replace(`https://${currentServer.value}/`, ''))
  }

  if (statusUri.search(/^\d+$/) !== -1) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.info(`statusUri parameter was passed an ID, so redirecting resolution request: ${statusUri}`)

    return fetchStatus(statusUri, force)
  }

  const localStatusIdCacheKey = generateStatusIdCacheKeyAccessibleToCurrentUser(statusUri)

  const cached: mastodon.v1.Status | Promise<mastodon.v1.Status> | undefined | null | number = cache.get(localStatusIdCacheKey, { allowStale: false, updateAgeOnGet: false })
  if (cached) {
    if (
      !force
      && !!cached
      && !(typeof cached === 'number')
      && !(cached instanceof Promise)
      && (cached.uri === statusUri)
    ) {
      return cacheStatus(cached, force)
    }
    else if (cached instanceof Promise) {
      if (process.dev)
        console.warn('Returning promise', statusUri)
      return cached
    }
    else if (typeof cached === 'number') {
      if ([401, 403, 418].includes(cached)) {
        if (process.dev)
          console.error(`Current user is forbidden or lacks authorization to fetch status: ${statusUri}`)
        return Promise.resolve(null)
      }
      if ([404].includes(cached) && !force) {
        if (process.dev)
          console.error(`The requested status URI cannot be found: ${statusUri}`)
        return Promise.resolve(null)
      }
      if ([429].includes(cached)) {
        if (process.dev)
          console.error('The request was rate-limited by the Mastodon server')
        return Promise.resolve(null)
      }
      if ([500, 501, 503].includes(cached) && !force) {
        if (process.dev)
          console.error('The Mastodon server is unresponsive')
        return Promise.resolve(null)
      }
    }
  }

  const promise = useMastoClient().v2.search({ q: statusUri, type: 'statuses', resolve: (!!currentUser.value), limit: 1 })
    .then(async (results) => {
      const post = results.statuses.pop()
      if (!post) {
        console.error(`Status could not be federated, perhaps it no longer exists: '${statusUri}'`)
        cache.set(localStatusIdCacheKey, 404)
        return null
      }

      return cacheStatus(post, force)
    })
    .catch((e) => {
      console.error(`Encountered error while federating status using URI '${statusUri}' | ${(e as Error)}`)
      cache.set(localStatusIdCacheKey, null)
      return null
    })
  cache.set(localStatusIdCacheKey, promise)
  return promise
}

export async function bulkFederatePosts(uriArray: string[], force = false): Promise<mastodon.v1.Status[]> {
  const federatedPosts = Array<mastodon.v1.Status>()

  await Promise.allSettled(uriArray.map(async (uri) => {
    try {
      const federatedPost = await federateRemoteStatus(uri, force)
      if (federatedPost)
        federatedPosts.push(federatedPost)
    }
    catch (e) {
      console.error((e as Error).message)
    }
  }))
  return federatedPosts
}

export async function fetchStatus(statusId: string, force = false): Promise<mastodon.v1.Status | null> {
  if (cache.has(`stop:${statusId}`)) {
    if (process.dev)
      console.warn(`Skipping further processing for invalid status Id: ${statusId}`)
    return Promise.resolve(null)
  }

  // Handle scenario where the value of statusId is actually an URI
  if (statusId.startsWith('h'))
    return federateRemoteStatus(statusId, force)

  // handle invalid statusId
  if ((statusId.search(/^\d+$/) === -1)) {
    console.error(`Malformed or unrecognized Status ID: ${statusId}`)
    cache.set(`stop:${statusId}`, 418)
    return Promise.resolve(null)
  }

  const localStatusIdCacheKey = generateStatusIdCacheKeyAccessibleToCurrentUser(statusId)
  const cached: mastodon.v1.Status | Promise<mastodon.v1.Status> | undefined | null = cache.get(localStatusIdCacheKey, { allowStale: false, updateAgeOnGet: false })
  if (cached) {
    if (
      !force
      && !!cached
      && !(typeof cached === 'number')
      && !(cached instanceof Promise)
      && !(cached.reblog && !cached.reblog.account.url.includes(currentServer.value))
      && (cached.id === statusId)
    ) {
      return Promise.resolve(cached)
    }
    else if (cached instanceof Promise) {
      if (process.dev)
        console.warn('Returning promise', statusId)
      return cached
    }
    else if (typeof cached === 'number') {
      if ([401, 403, 418].includes(cached)) {
        if (process.dev)
          console.error(`Current user is forbidden or lacks authorization to fetch status: ${statusId}`)
        return Promise.resolve(null)
      }
      if ([404].includes(cached) && !force) {
        if (process.dev)
          console.error(`The requested status ID cannot be found: ${statusId}`)
        return Promise.resolve(null)
      }
      if ([429].includes(cached)) {
        if (process.dev)
          console.error('The request was rate-limited by the Mastodon server')
        return Promise.resolve(null)
      }
      if ([500, 501, 503].includes(cached) && !force) {
        if (process.dev)
          console.error('The Mastodon server is unresponsive')
        return Promise.resolve(null)
      }
    }
  }

  const promise = useMastoClient().v1.statuses.fetch(statusId)
    .then(async (post) => {
      // the current server is the authoritative server
      if (!post.reblog && post.uri.startsWith(`https://${currentServer.value}`)) {
        const accountWebfinger = extractAccountWebfinger(post.uri)!
        post.account.acct = accountWebfinger

        cache.set(localStatusIdCacheKey, post)
        // Intentionally overriding cached value because this should be the most recent
        cache.set(generateAuthoritativeStatusCacheKey(post.uri), post)
        return post
      }

      return cacheStatus(post, force)
    })
  cache.set(localStatusIdCacheKey, promise)
  return promise
}

async function fetchAuthoritativeStatus(statusUri: string, force = false): Promise<mastodon.v1.Status | null> {
  if (cache.has(`stop:${statusUri}`)) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.debug(`Skipping further processing for invalid status URI: ${statusUri}`)
    return Promise.resolve(null)
  }

  // Handle scenario where the value of statusUri is actually a numeric identifier
  if (statusUri.search(/^\d+$/) !== -1) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.info(`statusUri parameter was passed an ID, so redirecting resolution request: ${statusUri}`)

    return fetchStatus(statusUri, force)
  }

  const splitUri = statusUri.replace('https://', '').split('/')
  // handle invalid URI
  if (!statusUri.startsWith('https://') || (splitUri.length < 3)) {
    console.error(`Malformed or unrecognized Status URI: ${statusUri}`)
    cache.set(`stop:${statusUri}`, 418)
    return Promise.resolve(null)
  }

  const authoritativeServer = splitUri[0]
  const authoritativeStatusId = splitUri.pop()!
  if (authoritativeServer === currentServer.value) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.debug(`Local domain is authoritative, so redirecting resolution request for status id: ${authoritativeStatusId}`)

    return fetchStatus(authoritativeStatusId)
  }

  const authoritativeStatusCacheKey = generateAuthoritativeStatusCacheKey(statusUri)
  const cachedAuthoritative: mastodon.v1.Status | Promise<mastodon.v1.Status> | undefined | null | number = cache.get(authoritativeStatusCacheKey, { allowStale: false, updateAgeOnGet: false })
  if (cachedAuthoritative) {
    if (
      !force
      && !!cachedAuthoritative
      && !(typeof cachedAuthoritative === 'number')
      && !(cachedAuthoritative instanceof Promise)
      && (cachedAuthoritative.uri === statusUri)
    ) {
      return Promise.resolve(cachedAuthoritative)
    }
    else if (cachedAuthoritative instanceof Promise) {
      if (process.dev)
        console.warn('Returning promise', statusUri)
      return cachedAuthoritative
    }
    else if (typeof cachedAuthoritative === 'number') {
      if ([401, 403, 418].includes(cachedAuthoritative)) {
        if (process.dev)
          console.error(`Current user is forbidden or lacks authorization to fetch status: ${statusUri}`)
        return Promise.resolve(null)
      }
      if ([404].includes(cachedAuthoritative) && !force) {
        if (process.dev)
          console.error(`The requested status URI cannot be found: ${statusUri}`)
        return Promise.resolve(null)
      }
      if ([429].includes(cachedAuthoritative)) {
        if (process.dev)
          console.error('The request was rate-limited by the Mastodon server')
        return Promise.resolve(null)
      }
      if ([500, 501, 503].includes(cachedAuthoritative) && !force) {
        if (process.dev)
          console.error('The Mastodon server is unresponsive')
        return Promise.resolve(null)
      }
    }
  }

  const req = new Request(`https://${authoritativeServer}/api/v1/statuses/${authoritativeStatusId}`)
  // req.headers.set('User-Agent', 'Mozilla/5.0 (compatible; Fedified Elk/0.9.0; +https://elk.fedified.com)')
  req.headers.set('Accept', 'application/json')
  req.headers.delete('Authorization')

  const promise = fetch(req)
    .then((res) => {
      if (res.status !== 200) {
        console.error(`Authoritative Status could not be fetched: '${statusUri}'`)
        cache.set(authoritativeStatusCacheKey, res.status)
        return null
      }
      return res.json() as Promise<Partial<mastodon.v1.Status> | mastodon.v1.Status>
    })
    .then((parsedPost) => {
      if (!parsedPost) {
        console.error(`Authoritative Status could not be parsed: '${statusUri}'`)
        cache.set(authoritativeStatusCacheKey, 400)
        return null
      }

      return normalizeAndCacheAuthoritativeStatus(parsedPost, true)
    })
    .catch((e) => {
      console.error(`Encountered error while fetching authoritative Status using URI '${statusUri}' | ${(e as Error).message}`)
      cache.set(authoritativeStatusCacheKey, null)
      return null
    })
  // Intentionally overriding cached value because this should be the most recent update
  cache.set(authoritativeStatusCacheKey, promise)
  return promise
}

export function normalizeAndCacheAuthoritativeStatus(status: Partial<mastodon.v1.Status> | mastodon.v1.Status, force = true): mastodon.v1.Status {
  const post = changeKeysToCamelCase(status) as mastodon.v1.Status

  const authoritativeStatusCacheKey = generateAuthoritativeStatusCacheKey(post.uri)

  post.account.acct = extractAccountWebfinger(post.account.url)!

  setCached(authoritativeStatusCacheKey, post, force)

  return post
}

export function normalizeAndCacheTrendingTag(source: string, tagUsage: { tag: string; statuses: number; reblogs: number } | { name: string; uses: number }, force = true): mastodon.v1.Tag {
  const startOfToday = (new Date().setUTCHours(0, 0, 0, 0) / 1000).toString()

  const newHistory = {
    day: startOfToday,
    uses: ('name' in tagUsage) ? tagUsage.uses.toString() : (tagUsage.statuses + tagUsage.reblogs).toString(),
    accounts: ('name' in tagUsage) ? 0 : tagUsage.statuses.toString(),
  } as mastodon.v1.TagHistory

  const tagName = ('name' in tagUsage) ? tagUsage.name : tagUsage.tag
  const derivedTag: mastodon.v1.Tag = {
    name: tagName,
    url: `https://${currentServer.value}/tags/${tagName}`,
    history: [newHistory],
    following: null,
  } as mastodon.v1.Tag

  const cacheKey = generateTrendCacheKey(source, 'tag', tagName)

  useMastoClient().v1.tags.fetch(tagName)
    .then((tag) => {
      tag.history = (tag.history) ? [newHistory, ...tag.history.filter(_ => _.day !== startOfToday)] : [newHistory]

      setCached(cacheKey, tag, force)
      Object.assign(derivedTag, tag)
    })
    .catch((e) => {
      if (process.dev)
        console.warn(`Unable to fetch '${tagName}' tag information from host`, (e as Error).message)
    })

  setCached(cacheKey, derivedTag, false)

  return derivedTag
}

function federateRemoteAccount(webfingerOrUriOrUrl: string, force = false): Promise<mastodon.v1.Account | null> {
  const accountWebfinger = extractAccountWebfinger(webfingerOrUriOrUrl)
  if (!accountWebfinger) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.debug(`Not a valid account webfinger: ${accountWebfinger}`)
    return Promise.resolve(null)
  }

  if (accountWebfinger.includes(currentServer.value)) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.debug(`Local domain is authoritative, so redirecting resolution request for account: ${accountWebfinger}`)

    return fetchAccountByHandle(accountWebfinger, force)
  }

  const cacheKeyAuthoritativeAccount = generateAccountWebfingerCacheKeyAccessibleToCurrentUser(accountWebfinger)!

  const cachedAuthoritative: mastodon.v1.Account | Promise<mastodon.v1.Account> | undefined | null | number = cache.get(cacheKeyAuthoritativeAccount, { allowStale: false, updateAgeOnGet: false })

  if (cachedAuthoritative) {
    if (
      !force
      && !!cachedAuthoritative
      && !(typeof cachedAuthoritative === 'number')
      && !(cachedAuthoritative instanceof Promise)
      && (cachedAuthoritative.acct === accountWebfinger)
    ) {
      return Promise.resolve(cachedAuthoritative)
    }
    else if (cachedAuthoritative instanceof Promise) {
      return cachedAuthoritative
    }
    else if (typeof cachedAuthoritative === 'number') {
      if ([401, 403, 418].includes(cachedAuthoritative)) {
        if (process.dev)
          console.error(`Current user is forbidden or lacks authorization to fetch account: ${webfingerOrUriOrUrl}`)
        return Promise.resolve(null)
      }
      if ([404].includes(cachedAuthoritative) && !force) {
        if (process.dev)
          console.error(`The requested account Webfinger address cannot be found: ${webfingerOrUriOrUrl}`)
        return Promise.resolve(null)
      }
      if ([429].includes(cachedAuthoritative)) {
        if (process.dev)
          console.error('The request was rate-limited by the Mastodon server')
        return Promise.resolve(null)
      }
      if ([500, 501, 503].includes(cachedAuthoritative) && !force) {
        if (process.dev)
          console.error('The Mastodon server is unresponsive')
        return Promise.resolve(null)
      }
    }
  }

  const promise = useMastoClient().v2.search({ q: accountWebfinger, type: 'accounts', resolve: (currentUser.value !== undefined), limit: 1 })
    .then((results) => {
      const account = results.accounts.pop()
      if (!account) {
        console.error(`Account could not be federated, perhaps it no longer exists: '${accountWebfinger}'`)
        cache.set(cacheKeyAuthoritativeAccount, 404)
        return null
      }

      account.acct = extractAccountWebfinger(account.acct)!
      // Intentionally overriding cached value because this should be the most recent
      cache.set(cacheKeyAuthoritativeAccount, account)
      cache.set(generateAccountIdCacheKey(account.acct)!, account)
      cache.set(account.acct, account)

      return account
    })
    .catch((e) => {
      console.error(`Encountered error while federating account using Webfinger address '${accountWebfinger}' | ${(e as Error).message}`)
      cache.set(cacheKeyAuthoritativeAccount, null)
      return null
    })
  cache.set(cacheKeyAuthoritativeAccount, promise)
  return promise
}

export function fetchAccountById(accountId?: string | null, force = false): Promise<mastodon.v1.Account | null> {
  if (!accountId || accountId.trim() === '')
    return Promise.resolve(null)

  const cacheKeyAccountId = generateAccountIdCacheKey(accountId)
  const cachedAccountLocallyAccessibleToCurrentUser: mastodon.v1.Account | Promise<mastodon.v1.Account> | undefined | null | number = cache.get(cacheKeyAccountId)
  if (cachedAccountLocallyAccessibleToCurrentUser) {
    // avoid race condition by returning the existing promise instead of restarting the chain of events all over again
    if (
      !force
      && !!cachedAccountLocallyAccessibleToCurrentUser
      && !(typeof cachedAccountLocallyAccessibleToCurrentUser === 'number')
      && !(cachedAccountLocallyAccessibleToCurrentUser instanceof Promise)
      && (cachedAccountLocallyAccessibleToCurrentUser.id === accountId)
      && cachedAccountLocallyAccessibleToCurrentUser.url.includes(currentServer.value)
    ) {
      // if we already cached the authoritative value, then return that
      return Promise.resolve(cachedAccountLocallyAccessibleToCurrentUser)
    }
    if (cachedAccountLocallyAccessibleToCurrentUser instanceof Promise)
      return cachedAccountLocallyAccessibleToCurrentUser
    if (typeof cachedAccountLocallyAccessibleToCurrentUser === 'number') {
      if ([401, 403, 418].includes(cachedAccountLocallyAccessibleToCurrentUser)) {
        if (process.dev)
          console.error(`Current user is forbidden or lacks authorization to fetch account id: ${accountId}`)
        return Promise.resolve(null)
      }
      if ([404].includes(cachedAccountLocallyAccessibleToCurrentUser) && !force) {
        if (process.dev)
          console.error(`The requested account id cannot be found: ${accountId}`)
        return Promise.resolve(null)
      }
      if ([429].includes(cachedAccountLocallyAccessibleToCurrentUser)) {
        if (process.dev)
          console.error(`Rate-limiting interrupted request for account id: ${accountId}`)
        return Promise.resolve(null)
      }
      if ([500, 501, 503].includes(cachedAccountLocallyAccessibleToCurrentUser) && !force) {
        if (process.dev)
          console.error(`Unresponsive Mastodon server encountered while fetching account id: ${accountId}`)
        return Promise.resolve(null)
      }
    }
  }

  const promise = useMastoClient().v1.accounts.fetch(accountId)
    .then((account) => {
      const accountWebfinger = extractAccountWebfinger(account.url)
      if (!accountWebfinger) {
        console.error(`Malformed or invalid account Webfinger address: ${account.url}`)
        return null
      }
      account.acct = accountWebfinger
      cache.set(cacheKeyAccountId, account)
      return account
    })
    .catch((e) => {
      console.error(`Encountered error while fetching account Id '${accountId}' | ${(e as Error).message}`)
      cache.set(cacheKeyAccountId, 404)
      return null
    })
  cache.set(cacheKeyAccountId, promise)
  return promise
}

export function fetchAccountByHandle(str?: string, force = false): Promise<mastodon.v1.Account | null> {
  if (!str || str.trim() === '')
    return Promise.resolve(null)

  const accountWebfinger = extractAccountWebfinger(str)
  if (!accountWebfinger) {
    console.warn(`Malformed or invalid account handle: ${str}`)
    return Promise.resolve(null)
  }
  const cacheKeyWebfingerAccount = generateAccountWebfingerCacheKeyAccessibleToCurrentUser(accountWebfinger)!
  const cachedAccountLocallyAccessibleToCurrentUser: mastodon.v1.Account | Promise<mastodon.v1.Account> | undefined | null | number = cache.get(cacheKeyWebfingerAccount, { allowStale: false, updateAgeOnGet: false })

  if (cachedAccountLocallyAccessibleToCurrentUser) {
    if (
      !!cachedAccountLocallyAccessibleToCurrentUser
      && !(typeof cachedAccountLocallyAccessibleToCurrentUser === 'number')
      && !(cachedAccountLocallyAccessibleToCurrentUser instanceof Promise)
      && (cachedAccountLocallyAccessibleToCurrentUser.acct === accountWebfinger)
    ) {
      // if the cached version is authoritative, then return it
      if (!force && (cachedAccountLocallyAccessibleToCurrentUser.url.includes(currentServer.value)))
        return Promise.resolve(cachedAccountLocallyAccessibleToCurrentUser)
    }
    else if (cachedAccountLocallyAccessibleToCurrentUser instanceof Promise) {
      return cachedAccountLocallyAccessibleToCurrentUser
    }
    else if (typeof cachedAccountLocallyAccessibleToCurrentUser === 'number') {
      if ([401, 403, 418].includes(cachedAccountLocallyAccessibleToCurrentUser)) {
        console.error(`Current user is forbidden or lacks authorization to fetch account: ${accountWebfinger}`)
        return Promise.resolve(null)
      }

      if ([404].includes(cachedAccountLocallyAccessibleToCurrentUser) && !force) {
        console.error(`The requested account Webfinger address cannot be found: ${accountWebfinger}`)
        return Promise.resolve(null)
      }

      if ([429].includes(cachedAccountLocallyAccessibleToCurrentUser)) {
        console.error('The request was rate-limited by the Mastodon server')
        return Promise.resolve(null)
      }

      if ([500, 501, 503].includes(cachedAccountLocallyAccessibleToCurrentUser) && !force) {
        console.error('The Mastodon server is unresponsive')
        return Promise.resolve(null)
      }
    }
  }

  if (!accountWebfinger.includes(currentServer.value)) {
    if (process.dev)
      // eslint-disable-next-line no-console
      console.info(`Remote domain is authoritative, so redirecting resolution request for account: ${accountWebfinger}`)
    return federateRemoteAccount(accountWebfinger, force)
  }

  const promise = useMastoClient().v1.accounts.lookup({ acct: accountWebfinger ?? parseAcctFromPerspectiveOfCurrentServer(str) ?? str })
    .then((account) => {
      account.acct = accountWebfinger

      cache.set(cacheKeyWebfingerAccount, account)
      const cacheKeyAccountId = generateAccountIdCacheKey(account.id)
      cache.set(cacheKeyAccountId, account)

      return account
    })
    .catch((e) => {
      if (process.dev)
        console.error(`Encountered error while fetching account: '${accountWebfinger}' | ${(e as Error).message}`)
      cache.set(cacheKeyWebfingerAccount, 404)
      return null
    })
  cache.set(cacheKeyWebfingerAccount, promise)
  return promise
}

export async function enrichAndCacheStatus(post: mastodon.v1.Status, force = false) {
  const localStatusIdCacheKey = generateStatusIdCacheKeyAccessibleToCurrentUser(post.id)

  try {
    const authoritativeURI = post.reblog ? post.reblog.uri : post.uri
    const authoritativePost = await fetchAuthoritativeStatus(authoritativeURI, force)

    if (authoritativePost !== null) {
      post.reblogsCount = authoritativePost.reblogsCount
      post.repliesCount = authoritativePost.repliesCount
      post.favouritesCount = authoritativePost.favouritesCount

      if (post.reblog) {
        post.reblog.reblogsCount = authoritativePost.reblogsCount
        post.reblog.repliesCount = authoritativePost.repliesCount
        post.reblog.favouritesCount = authoritativePost.favouritesCount

        if (process.dev)
          // eslint-disable-next-line no-console
          console.debug('Status (reblogged) cached after enrichment:', post.reblog.id, post.reblog.account.acct, post.reblog.repliesCount, post.reblog.reblogsCount, post.reblog.favouritesCount)
      }
      else if (process.dev) {
        // eslint-disable-next-line no-console
        console.debug('Status cached after enrichment:', post.id, post.account.acct, post.repliesCount, post.reblogsCount, post.favouritesCount)
      }

      // Intentionally overriding cached value because this should be the most recent
      cache.set(localStatusIdCacheKey, post)
      return post
    }
    else {
      return post
    }
  }
  catch (e) {
    console.error(`Status was cached without refreshing authoritative stats could not be fetched: '${post.uri}'`)
    return post
  }
}

export async function cacheStatus(post: mastodon.v1.Status, force?: boolean) {
  const enrich = shouldBeEnriched(post)
  post.account.acct = extractAccountWebfinger(post.account.url)!

  if (post.reblog)
    post.reblog.account.acct = extractAccountWebfinger(post.reblog.account.url)!

  // FOR PUBLIC and UNLISTED statuses, get the real stats here
  if (
    enrich
    && (
      ((['public', 'unlisted'].includes(post.visibility.toString())) && (!post.uri.startsWith(`https://${currentServer.value}`)))
      || (post.reblog && (['public', 'unlisted'].includes(post.reblog.visibility.toString())) && (!post.reblog.uri.startsWith(`https://${currentServer.value}`)))
    ))
    return enrichAndCacheStatus(post, force)

  const localStatusIdCacheKey = generateStatusIdCacheKeyAccessibleToCurrentUser(post.id)

  if (process.dev) {
    if (force && cache.has(localStatusIdCacheKey) && enrich)
      console.warn('Enriched cached status was overwritten WITHOUT enrichment:', post.id, post.account.acct, post.repliesCount, post.reblogsCount, post.favouritesCount, post)
    else if (force && cache.has(localStatusIdCacheKey) && !enrich)

      console.warn('Cached status was updated:', post.id, post.account.acct, post.repliesCount, post.reblogsCount, post.favouritesCount)
    else if (force && !cache.has(localStatusIdCacheKey))
      // eslint-disable-next-line no-console
      console.debug('Status was newly-cached without enrichment:', post.id, post.account.acct, post.repliesCount, post.reblogsCount, post.favouritesCount)
    else if (cache.has(localStatusIdCacheKey))
      // eslint-disable-next-line no-console
      console.debug('Cached status was updated:', post.id, post.account.acct, post.repliesCount, post.reblogsCount, post.favouritesCount)
  }

  setCached(localStatusIdCacheKey, post, force)
  return post
}

export function removeCachedStatus(statusId: string) {
  removeCached(generateStatusIdCacheKeyAccessibleToCurrentUser(statusId))
}

export function cacheAccount(account: mastodon.v1.Account, override?: boolean) {
  setCached(generateAccountIdCacheKey(account.id)!, account, override)
  setCached(generateAccountWebfingerCacheKeyAccessibleToCurrentUser(account.url)!, account, override)
}

export async function cacheNotification(notification: mastodon.v1.Notification, override?: boolean) {
  setCached(generateNotificationIdCacheKey(notification.id), notification, override)

  cacheAccount(notification.account, override)

  if (!notification.status)
    return Promise.resolve(notification)

  return cacheStatus(notification.status, override)
    .then(() => {
      return notification
    }).catch((e) => {
      console.warn(`Unable to cache status extracted from notification: ${(e as Error).message}`)
      return notification
    })
}
