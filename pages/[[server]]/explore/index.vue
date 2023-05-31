<script lang="ts" setup>
import { STORAGE_KEY_HIDE_EXPLORE_POSTS_TIPS } from '~~/constants'

const { t } = useI18n()

const paginator = useMastoClient().v1.trends.listStatuses()
const { posts, refresh, trendSource } = $(await useTrends())

const isSourceFeditrends = $computed(() => trendSource && (trendSource === 'feditrends'))

const hideNewsTips = useLocalStorage(STORAGE_KEY_HIDE_EXPLORE_POSTS_TIPS, false)

useHydratedHead({
  title: () => `${t('tab.posts')} | ${t('nav.explore')}`,
})
onReactivated(() => {
  // Silently update data when reentering the page
  // The user will see the previous content first, and any changes will be updated to the UI when the request is completed
  refresh()
})
</script>

<template>
  <CommonAlert v-if="isHydrated && !hideNewsTips" @close="hideNewsTips = true">
    <p>{{ $t('tooltip.explore_posts_intro') }}</p>
  </CommonAlert>
  <div
    v-if="isSourceFeditrends"
    flex="~ gap-2" justify-between items-center
    border="b base" text-sm text-secondary px4 py2 sm:py4
  >
    <p>
      Visit <NuxtLink href="https://feditrends.com" external target="_blank">
        Feditrends
      </NuxtLink> for historical trends.
    </p>
  </div>

  <template v-for="item in posts" :key="item?.uri">
    <StatusCard :status="item" context="public" />
  </template>

  <!-- TODO: Tabs for trending statuses, tags, and links -->
  <TimelinePaginator v-if="posts.length === 0" :paginator="paginator" />

  <div p5 text-secondary italic text-center>
    {{ t('common.end_of_list') }}
  </div>
</template>
