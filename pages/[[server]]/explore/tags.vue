<script lang="ts" setup>
import { STORAGE_KEY_HIDE_EXPLORE_TAGS_TIPS } from '~~/constants'

const { t } = useI18n()

const { tags: trendingTags, updateTrendingTags, trendSource } = $(await useTrends())

const isSourceExternal = $computed(() => trendSource && (trendingTags.length > 0))

const isSourceFeditrends = $computed(() => trendSource && (trendingTags.length > 0) && (trendSource === 'feditrends'))

const hideTips = useLocalStorage(STORAGE_KEY_HIDE_EXPLORE_TAGS_TIPS, false)

const paginator = computed(() => (currentUser.value || trendingTags.length === 0) ? useMastoClient().v1.trends.listTags({ limit: 15 }) : undefined)

useHydratedHead({
  title: () => `${t('tab.hashtags')} | ${t('nav.explore')}`,
})

watch(
  currentUser,
  () => updateTrendingTags(true),
)

onReactivated(() => {
  // Silently update data when reentering the page
  // The user will see the previous content first, and any changes will be updated to the UI when the request is completed
  updateTrendingTags((trendingTags.length === 0))
})
</script>

<template>
  <CommonAlert v-if="isHydrated && !isSourceExternal && !hideTips" @close="hideTips = true">
    <p>{{ $t('tooltip.explore_tags_intro') }}</p>
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

  <template v-for="item in trendingTags" :key="item?.uri">
    <TagCard :tag="item" border="b base" />
  </template>

  <TagCardPaginator v-if="paginator" :paginator="paginator" />

  <div p5 text-secondary italic text-center>
    {{ t('common.end_of_list') }}
  </div>
</template>
