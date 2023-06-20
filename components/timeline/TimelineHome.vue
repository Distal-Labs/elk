<script setup lang="ts">
import type { Paginator, mastodon } from 'masto'

const paginator = ref<Paginator<mastodon.v1.Status[], mastodon.v1.ListTimelineParams>>()

const { data, pending, refresh: refreshTimeline } = useAsyncData(
  `${currentServer.value}:${currentUser.value}:timeline:home`,
  async () => paginator.value = useMastoClient().v1.timelines.listHome({ limit: 15 }),
  { watch: [isHydrated], immediate: isHydrated.value, default: () => shallowRef() },
)

const stream = $(useStreaming(client => client.v1.stream.streamUser()))
function reorderAndFilter(items: mastodon.v1.Status[]) {
  return reorderedTimeline(items, 'home')
}

onReactivated(() => {
  // Silently update data when leaving the page
  // The user will see the previous content first, and any changes will be updated to the UI when the request is completed
  refreshTimeline()
})
</script>

<template>
  <div>
    <PublishWidget draft-key="home" border="b base" />
    <TimelinePaginator v-if="paginator" v-bind="{ paginator, stream }" :preprocess="reorderAndFilter" context="home" />
  </div>
</template>
