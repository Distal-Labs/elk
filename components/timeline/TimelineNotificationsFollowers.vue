<script setup lang="ts">
const { name: routeName } = useRoute()

const { paginator } = useNotifications(routeName ? routeName.toString() : 'notifications-followers')
</script>

<template>
  <template v-if="!!currentUser && paginator">
    <NotificationPaginator :paginator="paginator" />
  </template>
</template>
