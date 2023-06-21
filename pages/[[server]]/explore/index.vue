<script lang="ts" setup>
import type { mastodon } from 'masto'
import { STORAGE_KEY_HIDE_EXPLORE_POSTS_TIPS } from '~~/constants'

const { t } = useI18n()

const { posts: trendingPosts, updateTrendingPosts, trendSource } = $(await useTrends())

const isSourceExternal = $computed(() => trendSource && (trendingPosts.length > 0))

const isSourceFeditrends = $computed(() => trendSource && (trendingPosts.length > 0) && (trendSource === 'feditrends'))

const hideTips = useLocalStorage(STORAGE_KEY_HIDE_EXPLORE_POSTS_TIPS, false)

function preprocess(items: mastodon.v1.Status[]) {
  return (trendingPosts && trendingPosts.length > 0) ? trendingPosts : items
}

const paginator = computed(() => (currentUser.value || trendingPosts.length === 0) ? useMastoClient().v1.trends.listStatuses() : undefined)

useHydratedHead({
  title: () => `${t('tab.posts')} | ${t('nav.explore')}`,
})

watch(
  currentUser,
  () => updateTrendingPosts(true),
)

onReactivated(() => {
  // Silently update data when reentering the page
  // The user will see the previous content first, and any changes will be updated to the UI when the request is completed
  updateTrendingPosts((trendingPosts.length === 0))
})
</script>

<template>
  <CommonAlert v-if="isHydrated && !isSourceExternal && !hideTips" @close="hideTips = true">
    <p>{{ $t('tooltip.explore_posts_intro') }}</p>
  </CommonAlert>
  <div
    v-if="isSourceFeditrends"
    flex="~ gap-2" justify-between items-center
    border="b base" text-sm text-secondary px4 py2
  >
    <NuxtLink v-if="isSourceFeditrends" href="https://feditrends.com" external target="_blank">
      <span v-if="isSourceFeditrends" flex="~ col" w-full pt1 text-sm text-secondary leading-snug>
        Courtesy of Feditrends
      </span>
    </NuxtLink>
  </div>

  <template v-for="item in trendingPosts" :key="item?.uri">
    <StatusCard :status="item" context="public" />
  </template>

  <!-- TODO: Tabs for trending statuses, tags, and links -->
  <TimelinePaginator v-if="paginator" :paginator="paginator" :preprocess="preprocess" />

  <div p5 text-secondary italic text-center>
    {{ t('common.end_of_list') }}
  </div>
</template>
