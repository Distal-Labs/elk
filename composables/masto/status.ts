import type { mastodon } from 'masto'
import { refThrottled, watchWithFilter } from '@vueuse/core'

type Action = 'reblogged' | 'favourited' | 'bookmarked' | 'pinned' | 'muted'
type CountField = 'reblogsCount' | 'favouritesCount'

export interface StatusActionsProps {
  status: mastodon.v1.Status
  // Fedified extensions
  targetIsVisible?: boolean
  pathName?: string
}

export function useStatusActions(props: StatusActionsProps) {
  const _status = ref<mastodon.v1.Status>(props.status)
  const status = refThrottled(_status, 1000, false, false)
  const __targetIsVisible = ref<boolean>(false)
  const isIncreasing = ref<{ favouritesCount: boolean; reblogsCount: boolean }>({ favouritesCount: true, reblogsCount: true })
  const isActionInProgress = ref<Action | null>(null)

  const { client } = $(useMasto())

  // Use different states to let the user press different actions right after the other
  const isLoading = $ref({
    reblogged: false,
    favourited: false,
    bookmarked: false,
    pinned: false,
    translation: false,
    muted: false,
  })

  watchWithFilter(
    () => props,
    async (val) => {
      if (val.targetIsVisible) {
        if (process.dev)
          // eslint-disable-next-line no-console
          console.debug('Visible!', props.targetIsVisible, '-->', __targetIsVisible.value, status.value.account.acct, status.value.id, status.value.repliesCount, status.value.reblogsCount, status.value.favouritesCount)

        __targetIsVisible.value = val.targetIsVisible
      }

      if (__targetIsVisible.value) {
        // if (isActionInProgress.value && val.pathName !== 'home')
        //   return;

        ((!isActionInProgress.value)
          ? cacheStatus({ ...status.value }, true, val.pathName === 'home')
          // ? cacheStatus({...status.value}, true, true)
          : cacheStatus({ ...status.value }, val.pathName !== 'home', false))
          // : fetchStatus(status.value.id, true) ?? {...status.value} )
          .then((fetchedResponse) => {
            if (!fetchedResponse)
              return

            if (process.dev) {
              // eslint-disable-next-line no-console
              console.debug('FETCHED via SCROLL', val.status?.account.acct, val.status?.id, val.status?.repliesCount, val.status?.reblogsCount, val.status?.favouritesCount
                , '-->', fetchedResponse?.repliesCount, fetchedResponse?.reblogsCount, fetchedResponse?.favouritesCount,
              )
            }
            if (fetchedResponse?.reblogsCount > _status.value.reblogsCount) {
              isIncreasing.value.reblogsCount = true
              isLoading.reblogged = true
              _status.value.reblogsCount = fetchedResponse.reblogsCount
            }

            if (fetchedResponse?.favouritesCount > _status.value.favouritesCount) {
              isIncreasing.value.favouritesCount = true
              isLoading.favourited = true
              _status.value.favouritesCount = fetchedResponse.favouritesCount
            }

            if (
              (fetchedResponse.repliesCount > _status.value.repliesCount)
              || (fetchedResponse.bookmarked !== val.status.bookmarked)
              || (fetchedResponse.pinned !== val.status.pinned)
              || (fetchedResponse.muted !== val.status.muted)
            ) {
              _status.value.repliesCount = fetchedResponse.repliesCount
              _status.value.bookmarked = fetchedResponse.bookmarked
              _status.value.pinned = fetchedResponse.pinned
              _status.value.muted = fetchedResponse.muted
            }
          })
          .then(() => {
            isLoading.reblogged = false
            isLoading.favourited = false
          })
          .catch((e) => {
            if (process.dev)
              console.error((e as Error).message)
          })
      }
    },
    { deep: true, immediate: false },
  )

  async function toggleStatusAction(action: Action, fetchNewStatus: () => Promise<mastodon.v1.Status>, countField?: CountField) {
    // check login
    if (!checkLogin())
      return

    const prevCount = countField ? status.value[countField] : null

    isLoading[action] = true

    isActionInProgress.value = action

    const isCancel = status.value[action] === true

    const updatedCount = isCancel ? ((prevCount ?? 0) - 1) : ((prevCount ?? 0) + 1)

    // if (process.dev)
    //   console.warn('ACTION', action, countField, prevCount, updatedCount, status.value.account.acct, status.value.id, status.value.repliesCount, status.value.reblogsCount, status.value.favouritesCount,
    //   'reblog?', status.value.reblog?.account?.acct, status.value.reblog?.id, status.value.reblog?.repliesCount, status.value.reblog?.reblogsCount, status.value.reblog?.favouritesCount);

    // Optimistic update
    const optimisticallyUpdatedStatus = status.value

    switch (action) {
      case 'reblogged':
        optimisticallyUpdatedStatus.reblogged = !status.value[action]
        optimisticallyUpdatedStatus.reblogsCount = updatedCount
        if (optimisticallyUpdatedStatus.reblog)
          optimisticallyUpdatedStatus.reblog.reblogsCount = updatedCount
        break
      case 'favourited':
        optimisticallyUpdatedStatus.favourited = !status.value[action]
        optimisticallyUpdatedStatus.favouritesCount = updatedCount
        if (optimisticallyUpdatedStatus.reblog)
          optimisticallyUpdatedStatus.reblog.favouritesCount = updatedCount
        break
      case 'bookmarked':
        optimisticallyUpdatedStatus.bookmarked = !status.value[action]
        break
      case 'pinned':
        optimisticallyUpdatedStatus.pinned = !status.value[action]
        break
      case 'muted':
        optimisticallyUpdatedStatus.muted = !status.value[action]
        break
      default:
        break
    }
    // cacheStatus(optimisticallyUpdatedStatus, true, true)
    // _status.value = optimisticallyUpdatedStatus

    await fetchNewStatus().then(async (fetchedResponse) => {
      // if (process.dev) {
      //   console.warn('ACTION', action, countField, _status.value.account.acct, _status.value.id, _status.value.repliesCount, _status.value.reblogsCount, _status.value.favouritesCount
      //   // , '===', optimisticallyUpdatedStatus.repliesCount, optimisticallyUpdatedStatus.reblogsCount, optimisticallyUpdatedStatus.favouritesCount
      //   , '<--X', fetchedResponse?.repliesCount, fetchedResponse?.reblogsCount, fetchedResponse?.favouritesCount
      //   )
      // }

      const t = await cacheStatus(optimisticallyUpdatedStatus, true, true)
      _status.value = t
      return t
    })
      .then((fetchedResponse) => {
        console.warn('ACTION -> CACHED (FORCED)', action, countField, _status.value.account.acct, _status.value.id, _status.value.repliesCount, _status.value.reblogsCount, _status.value.favouritesCount
          // , '===', optimisticallyUpdatedStatus.repliesCount, optimisticallyUpdatedStatus.reblogsCount, optimisticallyUpdatedStatus.favouritesCount
          , '===', fetchedResponse?.repliesCount, fetchedResponse?.reblogsCount, fetchedResponse?.favouritesCount,
        )
        isLoading[action] = false
        isActionInProgress.value = null
      })
      .catch(() => {
      // _status.value = optimisticallyUpdatedStatus
        isLoading[action] = false
        isActionInProgress.value = null
      })
    return _status.value
  }

  const canReblog = $computed(() => {
    return (
      status.value.visibility !== 'direct'
      && (status.value.visibility !== 'private' || status.value.account.id === currentUser.value?.account.id)
    )
  })

  const toggleReblog = () => toggleStatusAction(
    'reblogged',
    () => client.v1.statuses[!status.value.reblogged ? 'unreblog' : 'reblog'](status.value.id),
    'reblogsCount',
  )

  const toggleFavourite = () => toggleStatusAction(
    'favourited',
    () => client.v1.statuses[!status.value.favourited ? 'unfavourite' : 'favourite'](status.value.id),
    'favouritesCount',
  )

  const toggleBookmark = () => toggleStatusAction(
    'bookmarked',
    () => client.v1.statuses[!status.value.bookmarked ? 'unbookmark' : 'bookmark'](status.value.id),
  )

  const togglePin = async () => toggleStatusAction(
    'pinned',
    () => client.v1.statuses[!status.value.pinned ? 'unpin' : 'pin'](status.value.id),
  )

  const toggleMute = async () => toggleStatusAction(
    'muted',
    () => client.v1.statuses[!status.value.muted ? 'unmute' : 'mute'](status.value.id),
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
    isIncreasing,
  }
}
