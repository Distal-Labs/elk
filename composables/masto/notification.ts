import type { Paginator, WsEvents, mastodon } from 'masto'
import { useFeeds } from '~/composables/discovery'

const notifications = reactive<Record<string, undefined | [Promise<WsEvents>, mastodon.v1.Notification[]]>>({})

const maxItemsToPreload = 1000
const pageSize = 20

export function useNotifications(_routeName: string) {
  const accountId = currentUser.value?.account.id

  const { client, canStreaming } = $(useMasto())

  const processableItems = ref<mastodon.v1.Notification[]>([])

  const stream = ref<Promise<WsEvents>>()

  const paginator = ref<Paginator<mastodon.v1.Notification[], mastodon.v1.ListNotificationsParams>>()

  watch(
    () => _routeName,
    () => {
      if (!accountId || !notifications[accountId])
        return

      // Now do something
      if (_routeName === 'notifications-posts')
        paginator.value = client.v1.notifications.list({ limit: pageSize, types: ['status'], excludeTypes: ['mention'] })
      else if (_routeName === 'notifications-followers')
        paginator.value = client.v1.notifications.list({ limit: pageSize, types: ['follow', 'follow_request'] })
      else if (_routeName === 'notifications-mention')
        paginator.value = client.v1.notifications.list({ limit: pageSize, types: ['mention'] })
      else
        paginator.value = client.v1.notifications.list({ limit: pageSize, types: ['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report'] })
    },
    {
      immediate: true,
      deep: false,
    },
  )

  const excludeMissingAltTextInNotifications = usePreferences('excludeMissingAltTextInNotifications')
  const excludeAltTextMinderInNotifications = usePreferences('excludeAltTextMinderInNotifications')
  const excludeBoostsInNotifications = usePreferences('excludeBoostsInNotifications')
  const excludeDMsInNotifications = usePreferences('excludeDMsInNotifications')
  const excludeNSFWInNotifications = usePreferences('excludeNSFWInNotifications')
  const excludeMentionsFromUnfamiliarAccountsInNotifications = usePreferences('excludeMentionsFromUnfamiliarAccountsInNotifications')
  const excludeSpammersInNotifications = usePreferences('excludeSpammersInNotifications')
  const experimentalAntagonistFilterLevel = usePreferences('experimentalAntagonistFilterLevel')

  const { data: feeds } = useAsyncData(
    async () => {
      if (!processableItems.value || processableItems.value.length === 0)
        return useFeeds()

      if (
        (!excludeMentionsFromUnfamiliarAccountsInNotifications.value)
        && (experimentalAntagonistFilterLevel.value < 5)
      ) {
        return useFeeds()
      }

      else {
        const relationships: mastodon.v1.Relationship[] = await useMastoClient().v1.accounts.fetchRelationships(processableItems.value.map(x => x.account.id))
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
        excludeMissingAltTextInNotifications,
        excludeAltTextMinderInNotifications,
        excludeBoostsInNotifications,
        excludeDMsInNotifications,
        excludeNSFWInNotifications,
        excludeMentionsFromUnfamiliarAccountsInNotifications,
        excludeSpammersInNotifications,
        experimentalAntagonistFilterLevel,
        currentUser,
      ],
      immediate: true,
      default: () => shallowRef(useFeeds()),
    },
  )

  function preprocessNotifications(_items: mastodon.v1.Notification[]): mastodon.v1.Notification[] {
    if (!currentUser.value)
      return Array<mastodon.v1.Notification>()

    // Avoid updating processableItems unless that's going to change the feed logic
    if (
      (excludeMentionsFromUnfamiliarAccountsInNotifications.value === true)
      || (experimentalAntagonistFilterLevel.value === 5)
    ) {
      processableItems.value = _items.filter(feeds.value.shouldBeInNotifications)

      return applyNotificationFilterContext([...processableItems.value])
    }
    else {
      return applyNotificationFilterContext(_items.filter(useFeeds().shouldBeInNotifications))
    }
  }

  function countActiveNotifications(): number {
    if (!accountId || !notifications[accountId])
      return 0

    // else if (_routeName === 'notifications') {
    //   return notifications[accountId]![1].length
    // }
    // else if (_routeName === 'notifications-mention') {
    //   return notifications[accountId]![1].filter(_ => _.type === 'mention').length
    // }
    // else if (_routeName === 'notifications-posts') {
    //   return notifications[accountId]![1].filter(_ => (_.type === 'status') && !['mention', 'reblog'].includes(_.type.toString())).length
    // }
    // else if (_routeName === 'notifications-followers') {
    //   return notifications[accountId]![1].filter(_ => ['follow', 'follow_request', 'grouped-follow'].includes(_.type.toString())).length
    // }
    else
      return notifications[accountId]![1].length
  }

  async function dismissAllNotifications() {
    if (!accountId || !notifications[accountId])
      return
    const lastReadId = notifications[accountId]![1].at(0)?.id
    notifications[accountId]![1] = []
    if (lastReadId) {
      client.v1.markers.create({ notifications: { lastReadId } })
        .then(async () => {
          for await (const notification of notifications[accountId]![1]) {
            if (notification.status?.visibility !== 'direct')
              dismissOneNotification(notification.id)
          }
        })
        .catch((e) => {
          if (process.dev)
            console.error(`Error encountered while clearing notifications on the Mastodon server: ${(e as Error).message}`)
        })
    }
  }

  async function dismissNotificationType(notificationType: mastodon.v1.NotificationType) {
    if (!accountId || !notifications[accountId])
      return
    const lastReadId = notifications[accountId]![1].at(0)?.id
    notifications[accountId]![1] = []
    if (lastReadId) {
      client.v1.markers.create({ notifications: { lastReadId } })
        .then(async () => {
          for await (const notification of notifications[accountId]![1]) {
            if (notification.status?.visibility !== 'direct' && notification.type === notificationType)
              dismissOneNotification(notification.id)
          }
        })
        .catch((e) => {
          if (process.dev)
            console.error(`Error encountered while clearing notifications on the Mastodon server: ${(e as Error).message}`)
        })
    }
  }

  async function dismissOneNotification(inputId: string) {
    if (!accountId || !notifications[accountId])
      return

    const _index = notifications[accountId]![1].findIndex(_ => (_.id === inputId) || (_.status?.id === inputId))
    const notificationId = (_index >= 0) ? notifications[accountId]![1].at(_index)!.id : inputId

    if (_index >= 0) {
      client.v1.notifications.dismiss(notificationId)
        .then(() => {
          if (_index >= 0)
            notifications[accountId]![1].splice(_index, 1)

          if (_routeName === 'notifications') {
            const lastReadId = notifications[accountId]![1].at(0)?.id
            if (lastReadId) {
              client.v1.markers.create({ notifications: { lastReadId } })
                .then((marker) => {
                  if (process.dev)
                    // eslint-disable-next-line no-console
                    console.debug('Updated last read marker in Notification timeline', marker.notifications)
                })
                .catch((e) => {
                  if (process.dev)
                    console.error(`Error encountered while updating the Notifications timeline marker on the Mastodon server: ${(e as Error).message}`)
                })
            }
          }
        })
        .catch((e) => {
          if (process.dev && !(e as Error).message.includes('not found'))
            console.error(`Error encountered while dismissing notification on the Mastodon server: ${(e as Error).message}`)
        })
    }
  }

  async function connect(): Promise<void> {
    if (!isHydrated.value || !accountId || notifications[accountId] || !currentUser.value?.token)
      return

    let resolveStream
    stream.value = new Promise<WsEvents>(resolve => resolveStream = resolve)
    notifications[accountId] = [stream.value, []]

    await until($$(canStreaming)).toBe(true)

    client.v1.stream.streamUser().then(resolveStream)

    stream.value.then((s: WsEvents) => {
      s.on('notification', async (wsEvent) => {
        preprocessAndAppendNotification(wsEvent)
      })
    })
      .catch((e) => {
        if (process.dev)
          console.error((e as Error).message)
      })

    const position = await client.v1.markers.fetch({ timeline: ['notifications'] })
    paginator.value = client.v1.notifications.list({ limit: pageSize })
    // This is triggered once the app is ready
    do {
      const result = await paginator.value.next()
      if (!result.done && result.value.length) {
        const preprocessedItems = preprocessNotifications(result.value)

        for (const notification of preprocessedItems) {
          if (notification.id === position.notifications.lastReadId)
            return

          const _index = notifications[accountId]![1].findIndex((i: any) => i.id === notification.id)
          if (_index >= 0)
            notifications[accountId]![1].splice(_index, 1)

          notifications[accountId]![1].push(notification)
        }
      }
      else {
        break
      }
    } while (notifications[accountId]![1].length < maxItemsToPreload)
  }

  function preprocessAndAppendNotification(_item: mastodon.v1.Notification) {
    if (!isHydrated.value || !accountId || notifications[accountId] || !currentUser.value?.token)
      return

    if (
      feeds.value.shouldBeInNotifications(_item)
    ) {
      const _index = notifications[accountId]![1].findIndex((i: any) => i.id === _item.id)
      if (_index >= 0)
        notifications[accountId]![1].splice(_index, 1)

      notifications[accountId]![1] = preprocessNotifications([_item, ...notifications[accountId]![1]])
    }
  }

  function disconnect(): void {
    if (!accountId || !notifications[accountId])
      return
    notifications[accountId]![0].then(stream => stream.disconnect())
    notifications[accountId] = undefined
  }

  watch(currentUser, disconnect)

  onHydrated(() => {
    connect()
  })

  return {
    paginator,
    stream,
    countActiveNotifications,
    disconnect,
    dismissOneNotification: (inputId: string) => {
      if (accountId)
        dismissOneNotification(inputId)
    },
    dismissAllNotifications,
    dismissNotificationType,
    preprocessAndAppendNotification,
  }
}
