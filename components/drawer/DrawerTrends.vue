<script lang="ts" setup>
import { STORAGE_KEY_HIDE_EXPLORE_POSTS_TIPS } from '~~/constants'

const { t } = useI18n()

const { posts, trendSource } = $(await useTrends())

const isSourceFeditrends = $computed(() => trendSource && (trendSource === 'feditrends'))

const hideNewsTips = useLocalStorage(STORAGE_KEY_HIDE_EXPLORE_POSTS_TIPS, false)
</script>

<template v-if="isHydrated && currentUser">
  <div v-if="posts.length > 0" min-h-content>
    <div flex flex-auto sm:px6 px2 xl:pb4 xl:pt5>
      <div :truncate="false" flex w-full data-tauri-drag-region class="native-mac:justify-center native-mac:text-center native-mac:sm:justify-start">
        <span py-4 border="b base" flex="~ col" p-3 w-full text-primary font-bold>What's happening</span>
      </div>
    </div>
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
      <StatusCard :status="item" context="account" />
    </template>

    <div p5 text-secondary italic text-center>
      {{ t('common.end_of_list') }}
    </div>
  </div>
</template>
