<script setup lang="ts">
const { t } = useI18n()
useHydratedHead({
  title: () => `${t('tab.notifications_status')} | ${t('nav.notifications')}`,
})
</script>

<template>
  <TimelineNotificationsPosts v-if="currentUser && isHydrated" />
</template>
