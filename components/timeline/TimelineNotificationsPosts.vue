<script setup lang="ts">
const paginator = useMastoClient().v1.notifications.list({ limit: 15, types: ['status'], excludeTypes: ['mention', 'reblog'] })
</script>

<template>
  <template v-if="!!currentUser">
    <NotificationPaginator v-bind="{ paginator }" />
  </template>
</template>
