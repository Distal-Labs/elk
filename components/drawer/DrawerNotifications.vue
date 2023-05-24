<script setup lang="ts">
type NotificationType = 'mention' | 'status' | 'reblog' | 'follow' | 'follow_request' | 'favourite' | 'poll' | 'update' | 'admin.sign_up' | 'admin.report'
const notificationTypes = ['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update']

const selectedNotificationTypes = ref<Array<NotificationType>>(['mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update'])

const { t } = useI18n()

const options = computed(() => ([
  { value: 'all', label: isHydrated.value ? t('tab.notifications_mention') : '', hide: false },
  { value: 'mention', label: isHydrated.value ? t('tab.notifications_mention') : '', hide: false },
  { value: 'status', label: isHydrated.value ? t('tab.notifications_status') : '', hide: true },
  { value: 'reblog', label: isHydrated.value ? t('tab.notifications_reblog') : '', hide: true },
  { value: 'follow', label: isHydrated.value ? t('tab.notifications_follow') : '', hide: true },
  { value: 'follow_request', label: isHydrated.value ? t('tab.notifications_follow_request') : '', hide: true },
  { value: 'favourite', label: isHydrated.value ? t('tab.notifications_favourite') : '', hide: true },
  { value: 'poll', label: isHydrated.value ? t('tab.notifications_poll') : '', hide: true },
  { value: 'update', label: isHydrated.value ? t('tab.notifications_update') : '', hide: true },
]))

const selectedOption = ref<string>('all')

function toggleSelectedOption() {
  if (selectedOption.value === 'all') {
    // console.info(`Toggling ${selectedOption.value}`)
    selectedNotificationTypes.value = notificationTypes as NotificationType[]
  }
  else {
    // console.info(`Toggling ${selectedOption.value}`)
    // selectedNotificationTypes.value = selectedNotificationTypes.value.filter((_) => _ !== selectedOption.value )
    selectedNotificationTypes.value = [selectedOption.value as NotificationType]
  }
}

// Default limit is 20 notifications, and servers are normally caped to 30
const paginator = computed(() => useMastoClient().v1.notifications.list({ limit: 30, types: selectedNotificationTypes.value }))
const stream = useStreaming(client => client.v1.stream.streamUser())

// const { clearNotifications } = useNotifications()
// onActivated(clearNotifications)
</script>

<template v-if="isHydrated && currentUser">
  <div min-h-content>
    <!-- <div flex w-full items-center lg:text-lg of-x-auto scrollbar-hide border="b base">
       <select id="select-notifications"
        v-model="selectedOption"
        class="select-settings"
        mb-4 py-0
        rounded-2
        h-10
        @change="toggleSelectedOption"
        >
        <option v-for="item in options" :key="item.value">{{ item.label }}</option>
      </select>
       -->
    <!-- <template
        v-for="(option, index) in options.filter(item => !item.hide)"
        :key="option?.name || index"
      >
        <div
          v-if="!option.disabled"
          :to="option.to"
          relative flex flex-auto cursor-pointer sm:px6 px2 rounded transition-all
          tabindex="1"
          hover:bg-active transition-100
          exact-active-class="children:(text-secondary !border-primary !op100 !text-base)"
          @click="!preventScrollTop && $scrollToTop()"
        >
          <span ws-nowrap mxa sm:px2 sm:py3 xl:pb4 xl:pt5 py2 text-center border-b-3 text-secondary-light hover:text-secondary border-transparent>{{ option.display || '&nbsp;' }}</span>
        </div>
        <div v-else flex flex-auto sm:px6 px2 xl:pb4 xl:pt5>
          <span ws-nowrap mxa sm:px2 sm:py3 py2 text-center text-secondary-light op50>{{ option.display }}</span>
        </div>
      </template> -->
    <!-- </div> -->
  </div>
  <NotificationPaginator v-bind="{ paginator, stream }" />
</template>
