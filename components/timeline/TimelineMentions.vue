<script setup lang="ts">
// Default limit is 20 notifications, and servers are normally caped to 30
const paginator = useMastoClient().v1.notifications.list({ limit: 15, types: ['mention'] })
</script>

<template>
  <template v-if="!!currentUser">
    <NotificationPaginator v-bind="{ paginator }" />
  </template>
</template>
