<script setup lang="ts">
const { name: routeName } = useRoute()

const { paginator } = useNotifications(routeName ? routeName.toString() : 'notifications')
const stream = useStreaming(client => client.v1.stream.streamUser())
</script>

<template>
  <template v-if="!!currentUser && paginator">
    <NotificationPaginator :paginator="paginator" :stream="stream" />
  </template>
</template>
