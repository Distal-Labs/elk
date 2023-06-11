import type { mastodon } from 'masto'

export function getDisplayName(account: mastodon.v1.Account, options?: { rich?: boolean }) {
  const displayName = account.displayName || account.username || account.acct || ''
  if (options?.rich)
    return displayName
  return displayName.replace(/:([\w-]+?):/g, '')
}

export function getShortHandle(account: mastodon.v1.Account) {
  if (!account.acct)
    return ''
  return `@${account.username}`
}

export function getServerName(account: mastodon.v1.Account) {
  return account.url.replace('https://', '').split('/')[0]
}

export function getFullHandle(account: mastodon.v1.Account) {
  const handle = `@${account.username}@${getServerName(account)}`
  return (currentUser.value?.server) ? handle.replace(`@${currentUser.value?.server}`, '') : handle
}

export function getAcctFromPerspectiveOfCurrentServer(account: mastodon.v1.Account) {
  const accountWebfingerAddress = `${account.username}@${getServerName(account)}`
  return accountWebfingerAddress.replace(`@${currentServer.value}`, '')
}

export function parseAcctFromPerspectiveOfCurrentServer(webfingerOrUriOrUrl: string) {
  return extractAccountWebfinger(webfingerOrUriOrUrl)?.replace(`@${currentServer.value}`, '') ?? undefined
}

export function parseAccountWebfingerRoute(account: mastodon.v1.Account) {
  return {
    server: currentServer.value,
    account: getAcctFromPerspectiveOfCurrentServer(account),
  }
}
