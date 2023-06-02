import type { WsEvents, mastodon } from 'masto'

const notifications = reactive<Record<string, undefined | [Promise<WsEvents>, mastodon.v1.Notification[]]>>({})

export function useNotifications() {
  const accountId = currentUser.value?.account.id

  const { client, canStreaming } = $(useMasto())

  function countNotifications(...notificationTypes: string[]): number
  function countNotifications(notificationTypes: string | string[] = ['all']): number {
    if (!accountId || !notifications[accountId])
      return 0
    const notificationsExcludingDMs = notifications[accountId]![1].filter(_ => (_.status?.visibility !== 'direct') && _.status)
    if (notificationTypes.includes('all')) {
      // All available types ['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report']
      return notificationsExcludingDMs.filter(_ => ['mention', 'status', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'admin.sign_up', 'admin.report', 'grouped-reblogs-and-favourites', 'grouped-follow'].includes(_.type)).length
    }
    else {
      return notificationsExcludingDMs.filter(_ => notificationTypes.includes(_.type)).length
    }
  }

  async function dismissAllNotifications() {
    if (!accountId || !notifications[accountId])
      return
    const lastReadId = notifications[accountId]![1].at(0)?.id
    notifications[accountId]![1] = []
    if (lastReadId) {
      await Promise.allSettled([
        client.v1.markers.create({ notifications: { lastReadId } }),
        client.v1.notifications.clear(),
      ]).catch((e) => {
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
      return await client.v1.notifications.dismiss(inputId)
        .catch((e) => {
          console.error(`Error encountered while dismissing notification on the Mastodon server: ${(e as Error).message}`)
        })
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
    const paginator = client.v1.notifications.list({ limit: 30 })
    do {
      const result = await paginator.next()
      if (!result.done && result.value.length) {
        for (const notification of result.value) {
          if (notification.status?.visibility === 'direct')
            return
          if (notification.id === position.notifications.lastReadId)
            return
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
    countNotifications: computed(() => accountId ? countNotifications('all') : 0),
    disconnect,
    dismissOneNotification: (inputId: string) => {
      if (accountId)
        dismissOneNotification(inputId)
    },
    dismissAllNotifications,
  }
}
