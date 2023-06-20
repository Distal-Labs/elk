import type { mastodon } from 'masto'

type Action = 'reblogged' | 'favourited' | 'bookmarked' | 'pinned' | 'muted'
type CountField = 'reblogsCount' | 'favouritesCount'

export interface StatusActionsProps {
  status: mastodon.v1.Status
}

export function useStatusActions(props: StatusActionsProps) {
  let status = $ref<mastodon.v1.Status>({ ...props.status })
  const { client } = $(useMasto())

  watch(
    () => props.status,
    val => status = { ...val },
    { deep: true, immediate: true },
  )

  // Use different states to let the user press different actions right after the other
  const isLoading = $ref({
    reblogged: false,
    favourited: false,
    bookmarked: false,
    pinned: false,
    translation: false,
    muted: false,
  })

  async function toggleStatusAction(action: Action, fetchNewStatus: () => Promise<mastodon.v1.Status>, countField?: CountField) {
    // check login
    if (!checkLogin())
      return

    const prevCount = () => {
      if (!countField)
        return undefined

      return (status.reblog) ? status.reblog[countField] : status[countField]
    }

    isLoading[action] = true

    const isCancel = status[action]

    fetchNewStatus().then(async (responseStatus) => {
      try {
        const newStatus = await cacheStatus(responseStatus, true)
        // when the action is cancelled, the count is not updated highly likely (if they're the same)
        // issue of Mastodon API
        // console.info(prevCount(), (countField) ? newStatus[countField] : countField, newStatus.reblog);

        if (isCancel && countField) {
          console.warn(prevCount(), newStatus[countField], newStatus.reblog)
          if (prevCount() === newStatus[countField])
            newStatus[countField] -= 1

          if (status.reblog && newStatus.reblog && status.reblog[countField] === newStatus.reblog[countField])
            newStatus.reblog[countField] -= 1
        }

        Object.assign(status, newStatus)
      }
      catch (e) {
        console.error((e as Error).message)
        Object.assign(status, responseStatus)
      }
    }).then(() => {
      isLoading[action] = false
    })
      .catch(() => {
        isLoading[action] = false
      })
    // Optimistic update
    status[action] = !status[action]

    if (countField) {
      if (status.reblog)
        status.reblog[countField] += status.reblog[action] ? 1 : -1
      else
        status[countField] += status[action] ? 1 : -1

      // console.info(prevCount(), (countField) ? status[countField] : countField, status.reblog);
    }
    cacheStatus(status, false)
  }

  const canReblog = $computed(() =>
    status.visibility !== 'direct'
    && (status.visibility !== 'private' || status.account.id === currentUser.value?.account.id),
  )

  const toggleReblog = () => toggleStatusAction(
    'reblogged',
    () => client.v1.statuses[status.reblogged ? 'unreblog' : 'reblog'](status.id).then(async (res) => {
      if (status.reblogged) {
        // returns the original status
        return res.reblog!
      }
      return res
    }),
    'reblogsCount',
  )

  const toggleFavourite = () => toggleStatusAction(
    'favourited',
    () => client.v1.statuses[status.favourited ? 'unfavourite' : 'favourite'](status.id),
    'favouritesCount',
  )

  const toggleBookmark = () => toggleStatusAction(
    'bookmarked',
    () => client.v1.statuses[status.bookmarked ? 'unbookmark' : 'bookmark'](status.id),
  )

  const togglePin = async () => toggleStatusAction(
    'pinned',
    () => client.v1.statuses[status.pinned ? 'unpin' : 'pin'](status.id),
  )

  const toggleMute = async () => toggleStatusAction(
    'muted',
    () => client.v1.statuses[status.muted ? 'unmute' : 'mute'](status.id),
  )

  return {
    status: $$(status),
    isLoading: $$(isLoading),
    canReblog: $$(canReblog),
    toggleMute,
    toggleReblog,
    toggleFavourite,
    toggleBookmark,
    togglePin,
  }
}
