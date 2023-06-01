import type { WsEvents, mastodon } from 'masto'

const conversations = reactive<Record<string, undefined | [Promise<WsEvents>, mastodon.v1.Conversation[]]>>({})

function removeFilteredItems(conversations: mastodon.v1.Conversation[], context: mastodon.v1.FilterContext): mastodon.v1.Conversation[] {
  const isStrict = (filter: mastodon.v1.FilterResult) => filter.filter.filterAction === 'hide' && filter.filter.context.includes(context)
  const isFiltered = (conversation: mastodon.v1.Conversation) => !conversation.lastStatus?.filtered?.find(isStrict)

  return [...conversations].filter(isFiltered)
}

export function filteredAndOrderedConversations(conversations: mastodon.v1.Conversation[]): mastodon.v1.Conversation[] {
  // Remove conversations that contain statuses with one or more filtered statuses
  const filteredConversations = removeFilteredItems(removeFilteredItems(conversations, 'home'), 'thread')

  const unreadConversationsWithLastStatus = filteredConversations
    .filter(_ => _.unread && !!_.lastStatus)
    .sort((a, b) => Date.parse(b.lastStatus!.createdAt) - Date.parse(a.lastStatus!.createdAt))

  const readConversationsWithLastStatus = filteredConversations
    .filter(_ => !_.unread && !!_.lastStatus)
    .sort((a, b) => Date.parse(b.lastStatus!.createdAt) - Date.parse(a.lastStatus!.createdAt))

  const unreadConversationsWithNullStatus = filteredConversations.filter(_ => _.unread && !_.lastStatus)

  const readConversationsWithNullStatus = filteredConversations.filter(_ => !_.unread && !_.lastStatus)

  return unreadConversationsWithLastStatus.concat(readConversationsWithLastStatus, unreadConversationsWithNullStatus, readConversationsWithNullStatus)
}

export function useConversations() {
  const id = currentUser.value?.account.id

  const { client, canStreaming } = $(useMasto())

  function isLastStatusInConversation(statusId: string) {
    if (!id || !conversations[id])
      return undefined

    const conversationsForCurrentUser = conversations[id]![1]
    return conversationsForCurrentUser.findIndex(_ => _.lastStatus?.id === statusId) !== -1
  }

  function isLastStatusUnread(statusId: string) {
    if (!id || !conversations[id])
      return undefined

    const conversationsForCurrentUser = conversations[id]![1]
    return conversationsForCurrentUser.find(_ => _.lastStatus?.id === statusId)?.unread
  }

  function isConversationUnread(conversationId: string) {
    if (!id || !conversations[id])
      return undefined

    const conversationsForCurrentUser = conversations[id]![1]
    return conversationsForCurrentUser.find(_ => _.id === conversationId)?.unread
  }

  async function markLastStatusRead(statusId: string) {
    if (!id || !conversations[id])
      return

    const conversationsForCurrentUser = conversations[id]![1]
    const conversation = conversationsForCurrentUser.find(_ => _.lastStatus?.id === statusId)

    if (conversation) {
      const conversationId = conversation.id
      await client.v1.conversations.read(conversationId)
      conversation.unread = false
    }
  }

  async function markConversationRead(conversationId: string) {
    if (!id || !conversations[id])
      return

    const conversationsForCurrentUser = conversations[id]![1]
    const conversation = conversationsForCurrentUser.find(_ => _.id === conversationId)

    if (conversation) {
      await client.v1.conversations.read(conversationId)
      conversation.unread = false
    }
  }

  async function connect(): Promise<void> {
    if (!isHydrated.value || !id || conversations[id] || !currentUser.value?.token)
      return

    let resolveStream
    const stream = new Promise<WsEvents>(resolve => resolveStream = resolve)
    conversations[id] = [stream, []]

    await until($$(canStreaming)).toBe(true)

    client.v1.stream.streamDirectTimeline().then(resolveStream)
    stream.then(s => s.on('conversation', (n) => {
      if (conversations[id])
        conversations[id]![1].unshift(n)
    }))

    const paginator = client.v1.conversations.list({ limit: 30 })
    do {
      const result = await paginator.next()
      if (!result.done && result.value.length) {
        for (const conversation of result.value) {
          if (conversation.unread === false)
            return
          conversations[id]![1].push(conversation)
        }
      }
      else {
        break
      }
    } while (true)
  }

  function disconnect(): void {
    if (!id || !conversations[id])
      return
    conversations[id]![0].then(stream => stream.disconnect())
    conversations[id] = undefined
  }

  watch(currentUser, disconnect)

  onHydrated(() => {
    connect()
  })

  return {
    countUnreadConversations: computed(() => id ? conversations[id]?.[1]?.filter(_ => _.unread)?.length ?? 0 : 0),
    disconnect,
    isLastStatusInConversation,
    isLastStatusUnread,
    isConversationUnread,
    markLastStatusRead,
    markConversationRead,
  }
}
