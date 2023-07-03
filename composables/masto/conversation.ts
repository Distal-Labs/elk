import type { Paginator, WsEvents, mastodon } from 'masto'
import { useFeeds } from '~/composables/discovery'

const conversations = reactive<Record<string, undefined | [Promise<WsEvents>, mastodon.v1.Conversation[]]>>({})

const maxItemsToLoad = 80
const pageSize = 20

export function useConversations(_routeName: string) {
  const accountId = currentUser.value?.account.id

  const { client, canStreaming } = $(useMasto())

  const processableItems = ref<mastodon.v1.Conversation[]>([])

  const stream = ref<Promise<WsEvents>>()

  const paginator = ref<Paginator<mastodon.v1.Conversation[], mastodon.v1.ListNotificationsParams>>()

  const excludeUnfamiliarAccountsInMessages = usePreferences('excludeUnfamiliarAccountsInMessages')
  const excludeCWsInMessages = usePreferences('excludeCWsInMessages')
  const excludeSexuallyExplicitInMessages = usePreferences('excludeSexuallyExplicitInMessages')
  const excludeSpammersInMessages = usePreferences('excludeSpammersInMessages')
  const experimentalAntagonistFilterLevel = usePreferences('experimentalAntagonistFilterLevel')

  const { data: feeds } = useAsyncData(
    async () => {
      if (!processableItems.value || processableItems.value.length === 0)
        return useFeeds()

      if (
        (!excludeUnfamiliarAccountsInMessages.value)
        && (experimentalAntagonistFilterLevel.value < 5)
      ) {
        return useFeeds()
      }

      else {
        const relationships: mastodon.v1.Relationship[] = await useMastoClient().v1.accounts.fetchRelationships(processableItems.value.flatMap(_ => (_.accounts).filter(x => !x.suspended).map(x => x.id)))
          .then(rels => rels)
          .catch((e) => {
            if (process.dev)
              console.error('Unable to retrieve relationships', (e as Error).message)
            return []
          })

        return useFeeds(relationships)
      }
    },
    {
      watch: [
        processableItems,
        excludeUnfamiliarAccountsInMessages,
        excludeCWsInMessages,
        excludeSexuallyExplicitInMessages,
        excludeSpammersInMessages,
        experimentalAntagonistFilterLevel,
        currentUser,
      ],
      immediate: true,
      default: () => shallowRef(useFeeds()),
    },
  )

  function preprocessConversations(_items: mastodon.v1.Conversation[]): mastodon.v1.Conversation[] {
    if (!currentUser.value)
      return Array<mastodon.v1.Conversation>()

    // Avoid updating processableItems unless that's going to change the feed logic
    if (
      (excludeUnfamiliarAccountsInMessages.value === true)
      || (experimentalAntagonistFilterLevel.value === 5)
    ) {
      processableItems.value = [..._items]

      return applyConversationFilterContext([...processableItems.value].filter(useFeeds().shouldBeInConversations))
    }
    else {
      return applyConversationFilterContext(_items.filter(useFeeds().shouldBeInConversations))
    }
  }

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
    stream.value = new Promise<WsEvents>(resolve => resolveStream = resolve)
    conversations[accountId] = [stream.value, []]

    await until($$(canStreaming)).toBe(true)

    client.v1.stream.streamDirectTimeline().then(resolveStream)
    stream.value.then((s: WsEvents) => {
      s.on('conversation', async (wsEvent) => {
        if (
          conversations[accountId]![1].length < maxItemsToLoad
          && feeds.value.shouldBeInConversations(wsEvent)
        ) {
          const _index = conversations[accountId]![1].findIndex((i: any) => i.id === wsEvent.id)
          if (_index >= 0)
            conversations[accountId]![1].splice(_index, 1)

          conversations[accountId]![1] = preprocessConversations([wsEvent, ...conversations[accountId]![1]])
        }
      })
    })
      .catch((e) => {
        if (process.dev)
          console.error((e as Error).message)
      })

    paginator.value = client.v1.conversations.list({ limit: pageSize })
    // This is triggered whenever the user scrolls downward
    do {
      const result = await paginator.value.next()
      if (!result.done && result.value.length) {
        const preprocessedItems = preprocessConversations(result.value)

        for (const conversation of preprocessedItems) {
          const _index = conversations[accountId]![1].findIndex((i: any) => i.id === conversation.id)
          if (_index >= 0)
            conversations[accountId]![1].splice(_index, 1)

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
    paginator,
    stream,
    countUnreadConversations: computed(() => accountId ? countConversations() : 0),
    disconnect,
    isLastStatusInConversation,
    isConversationUnread,
    markConversationRead,
  }
}
