<script setup lang="ts">
const { t } = useI18n()
useHydratedHead({
  title: () => `${t('tab.notifications_followers')} | ${t('nav.notifications')}`,
})
</script>

<template>
  <TimelineNotificationsFollowers v-if="currentUser && isHydrated" />
</template>
