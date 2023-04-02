import type { mastodon } from 'masto'

const maxDistance = 10
const maxSteps = 1000

// Checks if (b) is a reply to (a)
function areStatusesConsecutive(a: mastodon.v1.Status, b: mastodon.v1.Status) {
  const inReplyToId = b.inReplyToId ?? b.reblog?.inReplyToId
  return !!inReplyToId && (inReplyToId === a.reblog?.id || inReplyToId === a.id)
}

function removeFilteredItems(items: mastodon.v1.Status[], context: mastodon.v1.FilterContext, applyExtraFilters: boolean): mastodon.v1.Status[] {
  const isStrict = (filter: mastodon.v1.FilterResult) => filter.filter.filterAction === 'hide' && filter.filter.context.includes(context)
  const isFiltered = (item: mastodon.v1.Status) => (item.account.id === currentUser.value?.account.id) || !item.filtered?.find(isStrict)
  const isReblogFiltered = (item: mastodon.v1.Status) => !item.reblog?.filtered?.find(isStrict)
  if (applyExtraFilters) {
    const isKeptInFederated = (item: mastodon.v1.Status) => (item.account.bot !== true) // Remove bots
    // Remove low-yield accounts
    && (item.account.displayName.includes('nuop') !== true)
    && (item.account.followersCount >= 100)
    // Remove accounts that do not want to be featured
    && (item.account.locked !== true)
    && (item.account.discoverable !== false)
    // filter by language
    && (item.language === 'en')
    // Remove NSFW content
    && (item.spoilerText?.toLowerCase()?.includes('nsfw') !== true)
    && (item.spoilerText?.toLowerCase()?.includes('nudity') !== true)
    && (item.content?.toLowerCase()?.includes('nsfw') !== true)
    && (item.content?.toLowerCase()?.includes('porn') !== true)
    // Remove Twitter cross-posts
    && (item.content?.toLowerCase()?.includes('twitter.com') !== true)
    // Remove replies
    && ((item.inReplyToId === null) || (status.inReplyToId === undefined))

    return [...items].filter(isFiltered).filter(isReblogFiltered).filter(isKeptInFederated)
  }
  return [...items].filter(isFiltered).filter(isReblogFiltered)
}

export function reorderedTimeline(items: mastodon.v1.Status[], context: mastodon.v1.FilterContext = 'public', applyExtraFilters = false) {
  let steps = 0

  const newItems = removeFilteredItems(items, context, applyExtraFilters)

  for (let i = newItems.length - 1; i > 0; i--) {
    for (let k = 1; k <= maxDistance && i - k >= 0; k++) {
      // Prevent infinite loops
      steps++
      if (steps > maxSteps)
        return newItems

      // Check if the [i-k] item is a reply to the [i] item
      // This means that they are in the wrong order

      if (areStatusesConsecutive(newItems[i], newItems[i - k])) {
        const item = newItems.splice(i, 1)[0]
        newItems.splice(i - k, 0, item) // insert older item before the newer one
        k = 0
      }
      else if (k > 1) {
        // Check if the [i] item is a reply to the [i-k] item
        // This means that they are in the correct order but there are posts between them
        if (areStatusesConsecutive(newItems[i - k], newItems[i])) {
          // If the next statuses are already ordered, move them all
          let j = i
          for (; j < items.length - 1; j++) {
            if (!areStatusesConsecutive(newItems[j], newItems[j + 1]))
              break
          }
          const orderedCount = j - i + 1
          const itemsToMove = newItems.splice(i, orderedCount)
          // insert older item after the newer one
          newItems.splice(i - k + 1, 0, ...itemsToMove)
          k = 0
        }
      }
    }
  }
  return newItems
}
