import type { mastodon } from 'masto'

type Action = 'reblogged' | 'favourited' | 'bookmarked' | 'pinned' | 'muted'
type CountField = 'reblogsCount' | 'favouritesCount'

export interface StatusActionsProps {
  status: mastodon.v1.Status
  // Fedified extensions
  targetIsVisible?: boolean
}

export function useStatusActions(props: StatusActionsProps) {
  const _status = ref<mastodon.v1.Status>({ ...props.status })
  const status = ref<mastodon.v1.Status>(_status.value)
  const targetIsVisible = ref<boolean>(false)

  const { client } = $(useMasto())

  watch(
    () => props,
    async (val) => {
      _status.value = val.status
      targetIsVisible.value = val.targetIsVisible ?? false

      if (targetIsVisible.value) {
        if (status.value instanceof Promise)
          return

        await fetchStatus(_status.value.id, false)
          .then((fetchedResponse) => {
            status.value = fetchedResponse ?? _status.value
            if (process.dev)
              console.warn('ACTION FETCHED (not forced)', fetchedResponse?.account.acct, fetchedResponse?.id, fetchedResponse?.repliesCount, fetchedResponse?.reblogsCount, fetchedResponse?.favouritesCount)
          }).catch((e) => {
            if (process.dev)
              console.error((e as Error).message)
            status.value = _status.value
          })

        // await cacheStatus(status.value, true).then((aPost) => {
        //   if (aPost && !(aPost instanceof Promise)) {
        //     if (process.dev)
        //       console.warn('ACTION CACHED (FORCED)', aPost.account.acct, aPost.id, aPost.repliesCount, aPost.reblogsCount, aPost.favouritesCount)
        //     status.value = aPost
        //   }
        // }).catch((e) => {
        //   if (process.dev)
        //     console.error((e as Error).message)
        // });
      }
    },
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

    if (process.dev)

      console.warn('ACTION', action, countField, status.value.account.acct, status.value.id, status.value.repliesCount, status.value.reblogsCount, status.value.favouritesCount)

    const prevCount = () => {
      if (!countField)
        return undefined

      return status.value[countField]
    }

    isLoading[action] = true

    const isCancel = status.value[action]

    fetchNewStatus().then((newStatus) => {
      // when the action is cancelled, the count is not updated highly likely (if they're the same)
      // issue of Mastodon API
      if (isCancel && countField && (prevCount() ?? 0) === newStatus[countField]) {
        newStatus[countField] -= 1
      }
      else if (countField) {
        newStatus[countField] = ((prevCount() ?? 0) + 1)

        if (newStatus.reblog)
          newStatus.reblog[countField] = ((prevCount() ?? 0) + 1)

        return cacheStatus(newStatus, true)
      }
      else {
        return cacheStatus(newStatus, true)
      }
    }).then((cachedPost) => {
      status.value = cachedPost ?? _status.value
      isLoading[action] = false
    })
      .catch(() => {
        isLoading[action] = false
      })
    // Optimistic update
    status.value[action] = !status.value[action]

    if (countField)
      status.value[countField] += status.value[action] ? 1 : -1
    if (countField && status.value.reblog)
      status.value.reblog[countField] = status.value[countField]
    cacheStatus(status.value, false)
  }

  const canReblog = $computed(() => {
    return (
      status.value.visibility !== 'direct'
      && (status.value.visibility !== 'private' || status.value.account.id === currentUser.value?.account.id)
    )
  })

  const toggleReblog = () => toggleStatusAction(
    'reblogged',
    () => client.v1.statuses[status.value.reblogged ? 'unreblog' : 'reblog'](status.value.id).then(async (res) => {
      if (status.value.reblogged) {
        // returns the original status
        return res.reblog!
      }
      return res
    }),
    'reblogsCount',
  )

  const toggleFavourite = () => toggleStatusAction(
    'favourited',
    () => client.v1.statuses[status.value.favourited ? 'unfavourite' : 'favourite'](status.value.id),
    'favouritesCount',
  )

  const toggleBookmark = () => toggleStatusAction(
    'bookmarked',
    () => client.v1.statuses[status.value.bookmarked ? 'unbookmark' : 'bookmark'](status.value.id),
  )

  const togglePin = async () => toggleStatusAction(
    'pinned',
    () => client.v1.statuses[status.value.pinned ? 'unpin' : 'pin'](status.value.id),
  )

  const toggleMute = async () => toggleStatusAction(
    'muted',
    () => client.v1.statuses[status.value.muted ? 'unmute' : 'mute'](status.value.id),
  )

  return {
    status,
    isLoading: $$(isLoading),
    canReblog: $$(canReblog),
    toggleMute,
    toggleReblog,
    toggleFavourite,
    toggleBookmark,
    togglePin,
  }
}
