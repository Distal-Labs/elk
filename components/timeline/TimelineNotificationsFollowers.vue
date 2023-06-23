<script setup lang="ts">
import type { Paginator, mastodon } from 'masto'

// Default limit is 20 notifications, and servers are normally caped to 30
const paginator = ref<Paginator<mastodon.v1.Notification[], mastodon.v1.ListNotificationsParams>>()
// const stream = useStreaming(client => client.v1.stream.streamUser());

const { data, pending, refresh: refreshTimeline } = useAsyncData(
  `${currentServer.value}:${currentUser.value}:timeline:home`,
  async () => paginator.value = useMastoClient().v1.notifications.list({ limit: 30, types: ['follow', 'follow_request'] }),
  {
    watch: [isHydrated],
    immediate: isHydrated.value,
    default: () => shallowRef(),
    server: false,
    // transform: (notifications) => notifications.filter(_ => _.)
  },
)

onReactivated(() => {
  // Silently update data when reentering the page
  // The user will see the previous content first, and any changes will be updated to the UI when the request is completed
  refreshTimeline()
})
</script>

<template>
  <NotificationPaginator v-if="paginator" v-bind="{ paginator }" />
</template>
