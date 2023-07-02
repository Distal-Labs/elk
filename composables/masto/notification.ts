import type { WsEvents, mastodon } from 'masto'

const notifications = reactive<Record<string, undefined | [Promise<WsEvents>, mastodon.v1.Notification[]]>>({})

export function useNotifications() {
  const accountId = currentUser.value?.account.id

  const { client, canStreaming } = $(useMasto())

  const route = useRoute()

  const routeName = route.name?.toString()

  const notificationsExcludingDMs = $computed(() => (currentUser.value?.account.id) ? notifications[currentUser.value?.account.id]![1].filter(_ => (_.status?.visibility !== 'direct') && _.status) : [])

  function countActiveNotifications(notificationType?: mastodon.v1.NotificationType | 'all' | undefined): number {
    if (!accountId || !notifications[accountId]) {
      return 0
    }
    else if (routeName === 'notifications') {
      return notificationsExcludingDMs.length
    }
    else if (routeName === 'notifications-mention') {
      return notificationsExcludingDMs.filter(_ => _.type === 'mention').length
    }
    else if (!notificationType || notificationType === 'all') {
      // All available types ['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report']
      // return notificationsExcludingDMs.filter(_ => ['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report'].includes(_.type)).length
      return notificationsExcludingDMs.length
    }
    else {
      return notificationsExcludingDMs.filter(_ => _.type === notificationType).length
    }
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
    const notification = notifications[accountId]![1].find(_ => (_.id === inputId) || (_.status?.id === inputId))
    if (notification) {
      notifications[accountId]![1] = notifications[accountId]![1].filter(_ => (_.id !== notification.id))
      client.v1.notifications.dismiss(inputId).catch((e) => {
        if (process.dev)
          console.error(`Error encountered while dismissing notification on the Mastodon server: ${(e as Error).message}`)
      })
    }
  }

  async function refreshNotification(notification: mastodon.v1.Notification) {
    if (!accountId || !notifications[accountId] || !notification.status)
      return
    const notificationIndex = notifications[accountId]![1].findIndex(_ => (_.id === notification.id))

    if (notificationIndex !== -1 && notification.status) {
      if (process.dev)
        // eslint-disable-next-line no-console
        console.info('Refershing status for notification')

      const updatedStatus = await fetchStatus(notification.status.id)

      if (updatedStatus) {
        notification.status = updatedStatus
        notifications[accountId]![1].splice(notificationIndex, 1, notification)
      }
    }
  }

  async function connect(): Promise<void> {
    if (!isHydrated.value || !accountId || notifications[accountId] || !currentUser.value?.token)
      return

    let resolveStream
    const stream = new Promise<WsEvents>(resolve => resolveStream = resolve)
    notifications[accountId] = [stream, []]

    await until($$(canStreaming)).toBe(true)

    client.v1.stream.streamUser().then(resolveStream)
    stream.then(s => s.on('notification', (n) => {
      if (notifications[accountId] && n.status?.visibility !== 'direct' && n.status)
        notifications[accountId]![1].unshift(n)
    }))

    const position = await client.v1.markers.fetch({ timeline: ['notifications'] })
    const paginator = client.v1.notifications.list({ limit: 15 })
    do {
      const result = await paginator.next()
      if (!result.done && result.value.length) {
        for (const notification of result.value) {
          if (notification.id === position.notifications.lastReadId)
            return

          else if (notification.status?.visibility !== 'direct')
            notifications[accountId]![1].push(notification)
        }
      }
      else {
        break
      }
    } while (true)
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
    countActiveNotifications,
    disconnect,
    dismissOneNotification: (inputId: string) => {
      if (accountId)
        dismissOneNotification(inputId)
    },
    dismissAllNotifications,
    dismissNotificationType,
    refreshNotification,
  }
}
