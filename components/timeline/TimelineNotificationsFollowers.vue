<script setup lang="ts">
const paginator = useMastoClient().v1.notifications.list({ limit: 15, types: ['follow', 'follow_request'] })
</script>

<template>
  <template v-if="!!currentUser">
    <NotificationPaginator v-bind="{ paginator }" />
  </template>
</template>
