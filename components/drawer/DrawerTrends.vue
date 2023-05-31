<script lang="ts" setup>
const { t } = useI18n()

const { posts, refresh, trendSource } = $(await useTrends())

const isSourceFeditrends = $computed(() => trendSource && (trendSource === 'feditrends'))

onReactivated(() => {
  // Silently update data when reentering the page
  // The user will see the previous content first, and any changes will be updated to the UI when the request is completed
  refresh()
})
</script>

<template v-if="isHydrated && currentUser" mt-0>
  <div v-if="posts.length > 0" min-h-content>
    <div
      flex flex-wrap pb-0 mt-0
      sticky top-0 z10 backdrop-blur
      pt="[env(safe-area-inset-top,0)]"
      bg="[rgba(var(--rgb-bg-base),0.7)]"
      w-full
    >
      <div :truncate="false" mt-0 flex-none w-full class="native-mac:justify-center native-mac:text-center native-mac:sm:justify-start">
        <span pt-6 pb-6 border="b base" flex="~ col" p-3 w-full text-primary font-bold>What's happening</span>
      </div>
    </div>
    <div
      v-if="isSourceFeditrends"
      flex="~ gap-2" justify-between items-center flex-none w-full
      border="b base" text-sm text-secondary px4 py2 sm:py4
    >
      <p>
        Visit <NuxtLink href="https://feditrends.com" external target="_blank">
          Feditrends
        </NuxtLink> for historical trends.
      </p>
    </div>

    <template v-for="item in posts" :key="item?.uri">
      <div px0 my8>
        <StatusQuoteCard :status="item" context="account" :actions="true" :in-drawer="true" :in-notification="true" />
      </div>
    </template>

    <div p5 text-secondary italic text-center>
      {{ t('common.end_of_list') }}
    </div>
  </div>
</template>
