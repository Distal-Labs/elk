import type { EventType, Paginator, WsEvents, mastodon } from 'masto'
import type { Ref } from 'vue'
import { isCacheable, isProcessableItem } from './discovery'
import type { PaginatorState } from '~/types'

export function usePaginator<T, P, U = T>(
  _paginator: Paginator<T[], P>,
  stream: Ref<Promise<WsEvents> | undefined>,
  eventType: EventType = 'update',
  preprocess: (items: (T | U)[]) => U[] = items => items as unknown as U[],
  buffer = 6,
) {
  // called `next` method will mutate the internal state of the variable,
  // and we need its initial state after HMR
  // so clone it
  const paginator = _paginator // .clone()

  const state = ref<PaginatorState>(isHydrated.value ? 'idle' : 'loading')
  const items = ref<U[]>([])
  const nextItems = ref<U[]>([])
  const prevItems = ref<U[]>([])
  const queuedItems = ref<T[]>([])

  const endAnchor = ref<HTMLDivElement>()
  const bound = reactive(useElementBounding(endAnchor))
  const isInScreen = $computed(() => bound.top < window.innerHeight * 2)
  const error = ref<unknown | undefined>()
  const deactivated = useDeactivated()

  function update() {
    // This is called when the user clicks on the "Show more items banner" (scroll up, and there is a streaming connection with more items to show)
    if (eventType === 'notification') {
      (items.value as U[]) = preprocess([...(prevItems.value as U[]), ...(items.value as U[])])
      prevItems.value = []
      return
    }
    (items.value as U[]).unshift(...(prevItems.value as U[]))

    prevItems.value = []
  }

  watch(stream, (stream) => {
    stream?.then((s: WsEvents) => {
      s.on('update', async (wsEvent) => {
        if (isProcessableItem(wsEvent)) {
          const _index = prevItems.value.findIndex((i: any) => i.id === wsEvent.id)
          if (_index >= 0)
            prevItems.value.splice(_index, 1)

          const index = queuedItems.value.findIndex((i: any) => i.id === wsEvent.id)
          if (index >= 0)
            queuedItems.value.splice(index, 1)
          queuedItems.value.unshift(wsEvent as any)
        }
      })

      s.on('notification', async (wsEvent) => {
        if (wsEvent.status && isProcessableItem(wsEvent.status)) {
          if (isProcessableItem(wsEvent.status)) {
            const _index = prevItems.value.findIndex((i: any) => i.id === wsEvent.id)
            if (_index >= 0)
              prevItems.value.splice(_index, 1)

            const index = queuedItems.value.findIndex((i: any) => i.id === wsEvent.id)
            if (index >= 0)
              queuedItems.value.splice(index, 1)
            if ('type' in wsEvent)
              queuedItems.value.unshift(wsEvent as any)
          }
        }
      })

      s.on('conversation', async (wsEvent) => {
        if (wsEvent.lastStatus && isProcessableItem(wsEvent.lastStatus)) {
          if (isProcessableItem(wsEvent.lastStatus)) {
            const _index = prevItems.value.findIndex((i: any) => i.id === wsEvent.id)
            if (_index >= 0)
              prevItems.value.splice(_index, 1)

            const index = queuedItems.value.findIndex((i: any) => i.id === wsEvent.id)
            if (index >= 0)
              queuedItems.value.splice(index, 1)

            if ('type' in wsEvent)
              queuedItems.value.unshift(wsEvent as any)
          }
        }
      })

      // TODO: update statuses
      s.on('status.update', async (aStatus) => {
        if (isProcessableItem(aStatus)) {
          const status = (isCacheable(aStatus)) ? await cacheStatus(aStatus) : aStatus

          const data = items.value as mastodon.v1.Status[]
          const index = data.findIndex(s => s.id === status.id)
          if (index >= 0)
            data[index] = status
        }
      })

      s.on('delete', (id) => {
        removeCachedStatus(id)

        const data = items.value as mastodon.v1.Status[]
        const index = data.findIndex(s => s.id === id)
        if (index >= 0)
          data.splice(index, 1)
      })
    })
      .catch((e) => {
        if (process.dev)
          console.error((e as Error).message)
      })
  }, { immediate: true, deep: false })

  watch(
    queuedItems,
    () => {
      if ((buffer > 0) && (queuedItems.value.length < buffer)) {
        if (process.dev)
          console.warn('Not enough items to process', queuedItems.value.length, '<', buffer)
        return
      }

      const preprocessedItems = preprocess(queuedItems.value as T[])

      if ((buffer === 0) && (preprocessedItems.length === 0)) {
        if (process.dev)
          // eslint-disable-next-line no-console
          console.debug('Nothing to do except prevent infinite recursion')
        // Comment to keep upstream linting preferences from messing this up
      }
      else if ((buffer > 0) && (queuedItems.value.length >= buffer) && preprocessedItems.length === 0) {
        if (process.dev)
          console.warn('No items remain after processing')
        // Comment to keep upstream linting preferences from messing this up
        queuedItems.value = []
      }
      else {
        if (process.dev)
          console.warn('Items being added', preprocessedItems.length);
        // Comment to keep upstream linting preferences from messing this up
        (prevItems.value as U[]).unshift(...preprocessedItems.filter(_ => !!_))
        // Comment to keep upstream linting preferences from messing this up
        queuedItems.value = []
      }
    },
    { immediate: true, deep: true },
  )

  async function loadNext() {
    if (state.value !== 'idle')
      return

    state.value = 'loading'
    try {
      const result = await paginator.next()

      if (!result.done && result.value.length) {
        // This is called when the user scrolls through the current batch of items (scroll down, and there are more items to show)
        const preprocessedItems = preprocess([...nextItems.value, ...result.value] as (U | T)[])

        const itemsToShowCount = (preprocessedItems.length <= buffer) ? preprocessedItems.length : (preprocessedItems.length - buffer);

        (nextItems.value as U[]) = preprocessedItems.slice(itemsToShowCount);

        (items.value as U[]).push(...preprocessedItems.slice(0, itemsToShowCount))
        state.value = 'idle'
      }
      else {
        // This is called once the paginator runs out of items to show (scroll all the way down)
        const preprocessedItems = preprocess(nextItems.value as (U | T)[]);
        (items.value as U[]).push(...preprocessedItems)
        nextItems.value = []
        state.value = 'done'
      }
    }
    catch (e) {
      if (process.dev)
        console.error((e as Error).message)

      error.value = e
      state.value = 'error'
    }

    await nextTick()
    bound.update()
  }

  function disconnect(): void {
    stream.value?.then(stream => stream.disconnect())
  }

  if (process.client) {
    useIntervalFn(() => {
      bound.update()
    }, 1000)

    if (!isHydrated.value) {
      onHydrated(() => {
        state.value = 'idle'
        loadNext()
      })
    }

    watch(
      () => [isInScreen, state],
      () => {
        // No new content is loaded when the keepAlive page enters the background
        if (isInScreen && state.value === 'idle' && deactivated.value === false)
          loadNext()
        else if (state.value === 'error')
          disconnect()
      },
    )
  }

  return {
    items,
    prevItems,
    update,
    state,
    error,
    endAnchor,
    disconnect,
    resume: loadNext(),
  }
}
