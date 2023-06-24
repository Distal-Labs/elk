<script setup lang="ts">
import type { mastodon } from 'masto'
import { ref } from 'vue'
import { useElementVisibility } from '@vueuse/core'

const { notification } = defineProps<{
  notification: mastodon.v1.Notification
}>()

const post = ref<mastodon.v1.Status | null | undefined>(notification.status)

const isDM = computed(() => (post.value && post.value.visibility === 'direct'))

const { dismissOneNotification } = useNotifications()
const target = ref(null)
const targetIsVisible = useElementVisibility(target)

watch(
  [targetIsVisible],
  async () => {
    if (targetIsVisible.value) {
      dismissOneNotification(notification.id)
    }
    else if (notification.status && post.value && !targetIsVisible.value) {
      if (!post.value)
        post.value = notification.status

      if (post.value instanceof Promise)
        return

      await fetchStatus(notification.status.id, false).then((aPost) => {
        if (aPost)
          post.value = aPost
      }).catch((e) => {
        if (process.dev)
          console.error((e as Error).message)
      })
    }
  },
)
</script>

<template>
  <article v-if="isHydrated" ref="target" flex flex-col relative>
    <template v-if="notification.type === 'follow'">
      <NuxtLink :to="getAccountRoute(notification.account)">
        <div
          flex items-center absolute
          ps-3 pe-4 inset-is-0
          rounded-ie-be-3
          py-3 bg-base top-0
          :lang="post?.language ?? undefined"
        >
          <div i-ri:user-follow-fill me-1 color-primary />
          <AccountDisplayName :account="notification.account" text-primary me-1 font-bold line-clamp-1 ws-pre-wrap break-all />
          <span ws-nowrap>
            {{ $t('notification.followed_you') }}
          </span>
        </div>
        <AccountBigCard
          :account="notification.account"
          :lang="post?.language ?? undefined"
        />
      </NuxtLink>
    </template>
    <template v-else-if="notification.type === 'admin.sign_up'">
      <div flex p3 items-center bg-shaded>
        <div i-ri:admin-fill me-1 color-purple />
        <AccountDisplayName
          :account="notification.account"
          text-purple me-1 font-bold line-clamp-1 ws-pre-wrap break-all
        />
        <span>{{ $t("notification.signed_up") }}</span>
      </div>
    </template>
    <template v-else-if="notification.type === 'admin.report'">
      <NuxtLink :to="getReportRoute(notification.report?.id!)">
        <div flex p3 items-center bg-shaded>
          <div i-ri:flag-fill me-1 color-purple />
          <i18n-t keypath="notification.reported">
            <AccountDisplayName
              :account="notification.account"
              text-purple me-1 font-bold line-clamp-1 ws-pre-wrap break-all
            />
            <AccountDisplayName
              :account="notification.report?.targetAccount!"
              text-purple ms-1 font-bold line-clamp-1 ws-pre-wrap break-all
            />
          </i18n-t>
        </div>
      </NuxtLink>
    </template>
    <template v-else-if="notification.type === 'follow_request'">
      <div flex ms-4 items-center class="-top-2.5" absolute inset-ie-2 px-2>
        <div i-ri:user-follow-fill text-xl me-1 />
        <AccountInlineInfo :account="notification.account" me1 />
      </div>
      <!-- TODO: accept request -->
      <AccountCard :account="notification.account" />
    </template>
    <template v-else-if="post && !isDM && notification.type === 'update'">
      <StatusCard :status="post" :in-notification="true" :actions="false">
        <template #meta>
          <div flex="~" gap-1 items-center mt1>
            <div i-ri:edit-2-fill text-xl me-1 text-secondary />
            <AccountInlineInfo :account="notification.account" me1 />
            <span ws-nowrap>
              {{ $t('notification.update_status') }}
            </span>
          </div>
        </template>
      </StatusCard>
    </template>
    <template v-else-if="post && !isDM && (notification.type === 'status' || notification.type === 'mention' || notification.type === 'poll')">
      <StatusCard :status="post" :actions="true" :in-notification="true" :in-drawer="false" />
    </template>
    <template v-else-if="isDM">
      <div class="hidden" />
    </template>
    <template v-else>
      <!-- type 'favourite' and 'reblog' should always rendered by NotificationGroupedLikes -->
      <div text-red font-bold>
        [DEV] {{ $t('notification.missing_type') }} '{{ notification.type }}'
      </div>
    </template>
  </article>
</template>
