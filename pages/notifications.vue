<script setup lang="ts">
import type { CommonRouteTabOption } from '~/components/common/CommonRouteTabs.vue'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()
const pwaEnabled = useAppConfig().pwaEnabled

const tabs = $computed<CommonRouteTabOption[]>(() => [
  {
    name: 'all',
    to: '/notifications',
    display: isHydrated.value ? t('tab.notifications_all') : '',
    disabled: !isHydrated.value || !currentUser.value,
    command: true,
  },
  {
    name: 'posts',
    to: '/notifications/posts',
    display: isHydrated.value ? t('tab.notifications_status') : '',
    disabled: !isHydrated.value || !currentUser.value,
    command: false,
  },
  {
    name: 'mention',
    to: '/notifications/mention',
    display: isHydrated.value ? t('tab.notifications_mention') : '',
    disabled: !isHydrated.value || !currentUser.value,
    command: true,
  },
  {
    name: 'followers',
    to: '/notifications/followers',
    display: isHydrated.value ? t('tab.notifications_followers') : '',
    disabled: !isHydrated.value || !currentUser.value,
    command: false,
  },
])
</script>

<template>
  <MainContent>
    <template #title>
      <NuxtLink to="/notifications" timeline-title-style flex items-center gap-2 @click="$scrollToTop">
        <div i-ri:notification-4-line />
        <span>{{ t('nav.notifications') }}</span>
      </NuxtLink>
    </template>

    <template #actions>
      <NuxtLink
        flex rounded-4 p1
        hover:bg-active cursor-pointer transition-100
        :title="t('settings.notifications.show_btn')"
        to="/settings/notifications"
      >
        <span aria-hidden="true" i-ri:notification-badge-line />
      </NuxtLink>
    </template>

    <template #header>
      <CommonRouteTabs replace :options="tabs" />
    </template>

    <slot>
      <template v-if="pwaEnabled">
        <NotificationPreferences />
      </template>

      <NuxtPage />
    </slot>
  </MainContent>
</template>
