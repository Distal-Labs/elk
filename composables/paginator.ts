import type { Paginator, WsEvents, mastodon } from 'masto'
import type { Ref } from 'vue'
import type { PaginatorState } from '~/types'

export function usePaginator<T, P, U = T>(
  _paginator: Paginator<T[], P>,
  stream: Ref<Promise<WsEvents> | undefined>,
  eventType: 'notification' | 'update' = 'update',
  preprocess: (items: (T | U)[]) => U[] | Promise<U[]> = items => items as unknown as U[] | Promise<U[]>,
  buffer = 10,
) {
  // called `next` method will mutate the internal state of the variable,
  // and we need its initial state after HMR
  // so clone it
  const paginator = _paginator // .clone()

  const state = ref<PaginatorState>(isHydrated.value ? 'idle' : 'loading')
  const items = ref<U[]>([])
  const nextItems = ref<U[]>([])
  const prevItems = ref<T[]>([])

  const endAnchor = ref<HTMLDivElement>()
  const bound = reactive(useElementBounding(endAnchor))
  const isInScreen = $computed(() => bound.top < window.innerHeight * 2)
  const error = ref<unknown | undefined>()
  const deactivated = useDeactivated()

  async function update() {
    const preprocessedItems = await preprocess(prevItems.value as T[]);
    (items.value as U[]).unshift(...preprocessedItems)
    prevItems.value = []
  }

  watch(stream, (stream) => {
    stream?.then((s: WsEvents) => {
      s.on(eventType, async (wsEvent) => {
        if ('uri' in wsEvent) {
          try {
            const status = await cacheStatus(wsEvent, true)
            const index = prevItems.value.findIndex((i: any) => i.id === status.id)
            if (index >= 0)
              prevItems.value.splice(index, 1)

            prevItems.value.unshift(status as any)
          }
          catch (e) {
            console.error((e as Error).message)
          }
        }
        else {
          const index = prevItems.value.findIndex((i: any) => i.id === wsEvent.id)
          if (index >= 0)
            prevItems.value.splice(index, 1)

          prevItems.value.unshift(wsEvent as any)
        }
      })

      // TODO: update statuses
      s.on('status.update', (status) => {
        cacheStatus(status, true)

        const data = items.value as mastodon.v1.Status[]
        const index = data.findIndex(s => s.id === status.id)
        if (index >= 0)
          data[index] = status
      })

      s.on('delete', (id) => {
        removeCachedStatus(id)

        const data = items.value as mastodon.v1.Status[]
        const index = data.findIndex(s => s.id === id)
        if (index >= 0)
          data.splice(index, 1)
      })
    })
  }, { immediate: true })

  async function loadNext() {
    if (state.value !== 'idle')
      return

    state.value = 'loading'
    try {
      const result = await paginator.next()

      if (!result.done && result.value.length) {
        const preprocessedItems = await preprocess([...nextItems.value, ...result.value] as (U | T)[])

        const itemsToShowCount = (preprocessedItems.length <= buffer) ? preprocessedItems.length : (preprocessedItems.length - buffer);

        (nextItems.value as U[]) = preprocessedItems.slice(itemsToShowCount);

        (items.value as U[]).push(...preprocessedItems.slice(0, itemsToShowCount))
        state.value = 'idle'
      }
      else {
        const preprocessedItems = await preprocess(nextItems.value as (U | T)[]);
        (items.value as U[]).push(...preprocessedItems)
        nextItems.value = []
        state.value = 'done'
      }
    }
    catch (e) {
      console.error(e)

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
