<script setup lang="ts">
// Default limit is 20 notifications, and servers are normally caped to 30
const paginator = useMastoClient().v1.notifications.list({ limit: 15 })
const stream = useStreaming(client => client.v1.stream.streamUser())
</script>

<template>
  <template v-if="!!currentUser">
    <NotificationPaginator v-bind="{ paginator, stream }" />
  </template>
</template>
