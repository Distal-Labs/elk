import type { WsEvents, mastodon } from 'masto'

export function useConversations() {
  const conversations = reactive<Record<string, undefined | [Promise<WsEvents>, mastodon.v1.Conversation[]]>>({})

  const accountId = currentUser.value?.account.id

  const { client, canStreaming } = $(useMasto())

  function countConversations(): number {
    if (!accountId || !conversations[accountId])
      return 0
    else return conversations[accountId]![1]?.filter(_ => _.unread).length
  }

  function isLastStatusInConversation(statusId: string) {
    if (!accountId || !conversations[accountId])
      return undefined

    return conversations[accountId]![1].findIndex(_ => _.lastStatus?.id === statusId) !== -1
  }

  function isConversationUnread(inputId: string) {
    if (!accountId || !conversations[accountId])
      return undefined
    else return conversations[accountId]![1].find(_ => (_.id === inputId) || (_.lastStatus?.id === inputId))?.unread
  }

  async function markConversationRead(inputId: string) {
    if (!accountId || !conversations[accountId])
      return
    const conversation = conversations[accountId]![1].find(_ => (_.id === inputId) || (_.lastStatus?.id === inputId))
    if (conversation) {
      conversations[accountId]![1] = conversations[accountId]![1].filter(_ => (_.id !== conversation.id))
      return await client.v1.conversations.read(conversation.id)
        .catch((e) => {
          console.error(`Error encountered while marking conversation as readnotification on the Mastodon server: ${(e as Error).message}`)
        })
    }
  }

  async function connect(): Promise<void> {
    if (!isHydrated.value || !accountId || conversations[accountId] || !currentUser.value?.token)
      return

    let resolveStream
    const stream = new Promise<WsEvents>(resolve => resolveStream = resolve)
    conversations[accountId] = [stream, []]

    await until($$(canStreaming)).toBe(true)

    client.v1.stream.streamDirectTimeline().then(resolveStream)
    stream.then(s => s.on('conversation', (n) => {
      if (conversations[accountId])
        conversations[accountId]![1].unshift(n)
    }))

    const paginator = client.v1.conversations.list({ limit: 30 })
    do {
      const result = await paginator.next()
      if (!result.done && result.value.length) {
        for (const conversation of result.value) {
          if (conversation.unread === false)
            return
          conversations[accountId]![1].push(conversation)
        }
      }
      else {
        break
      }
    } while (true)
  }

  function disconnect(): void {
    if (!accountId || !conversations[accountId])
      return
    conversations[accountId]![0].then(stream => stream.disconnect())
    conversations[accountId] = undefined
  }

  watch(currentUser, disconnect)

  onHydrated(() => {
    connect()
  })

  return {
    disconnect,
    isLastStatusInConversation,
    countUnreadConversations: computed(() => accountId ? countConversations() : 0),
    isConversationUnread,
    markConversationRead,
  }
}
