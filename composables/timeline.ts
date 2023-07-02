import type { mastodon } from 'masto'

const maxDistance = 10
const maxSteps = 1000

function conversationFilterContext(conversations: mastodon.v1.Conversation[], context: mastodon.v1.FilterContext): mastodon.v1.Conversation[] {
  const isStrict = (filter: mastodon.v1.FilterResult) => filter.filter.filterAction === 'hide' && filter.filter.context.includes(context)
  const isFiltered = (conversation: mastodon.v1.Conversation) => !conversation.lastStatus?.filtered?.find(isStrict)

  return [...conversations].filter(isFiltered)
}

export function applyConversationFilterContext(feedItems: mastodon.v1.Conversation[]): mastodon.v1.Conversation[] {
  // Remove conversations that contain statuses with one or more filtered statuses
  return conversationFilterContext(conversationFilterContext(feedItems, 'home'), 'thread')
}

function notificationFilterContext(notifications: mastodon.v1.Notification[], context: mastodon.v1.FilterContext): mastodon.v1.Notification[] {
  const isStrict = (filter: mastodon.v1.FilterResult) => filter.filter.filterAction === 'hide' && filter.filter.context.includes(context)
  const isFiltered = (notification: mastodon.v1.Notification) => !notification.status?.filtered?.find(isStrict)

  return [...notifications].filter(isFiltered)
}

export function applyNotificationFilterContext(feedItems: mastodon.v1.Notification[]): mastodon.v1.Notification[] {
  // Remove notifications that should be filtered at the Mastodon API-level
  return notificationFilterContext(feedItems, 'notifications')
}

// Checks if (b) is a reply to (a)
function areStatusesConsecutive(a: mastodon.v1.Status, b: mastodon.v1.Status) {
  const inReplyToId = b.inReplyToId ?? b.reblog?.inReplyToId
  return !!inReplyToId && (inReplyToId === a.reblog?.id || inReplyToId === a.id)
}

function applyStatusFilterContext(feedItems: mastodon.v1.Status[], context: mastodon.v1.FilterContext): mastodon.v1.Status[] {
  const isStrict = (filter: mastodon.v1.FilterResult) => filter.filter.filterAction === 'hide' && filter.filter.context.includes(context)
  const isFiltered = (item: mastodon.v1.Status) => (!item.reblog && item.account.id === currentUser.value?.account.id) || !item.filtered?.find(isStrict)
  const isReblogFiltered = (item: mastodon.v1.Status) => !item.reblog?.filtered?.find(isStrict)

  return feedItems.filter(isFiltered).filter(isReblogFiltered)
}

function reorderStatusTimeline<T extends mastodon.v1.Status>(items: T[]): T[] {
  let steps = 0

  const newItems = items

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
          for (; j < newItems.length - 1; j++) {
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

export function preprocessTimeline(processableItems: mastodon.v1.Status[], context: mastodon.v1.FilterContext): mastodon.v1.Status[] {
  return reorderStatusTimeline(applyStatusFilterContext(processableItems, context))
}
