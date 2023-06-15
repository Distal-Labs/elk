<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    showTrendingPosts?: boolean
    showNotifications?: boolean
  }>(),
  {
    showTrendingPosts: true,
    showNotifications: false,
  })

const info = useBuildInfo()
</script>

<template>
  <nav>
    <div hidden lg="h-full grid grid-rows-[minmax(0,93vh)_minmax(0,93vh)_auto] gap-4 overflow-hidden">
      <div flex="~ col" justify-between h-full w-full overflow-x-hidden>
        <SearchWidget my-4 mx-4 hidden lg:block />

        <div
          v-if="isHydrated && currentUser"
          flex
          flex-col
          overflow-y-scroll
          overflow-x-clip
          max-w-full
          scrollbar-hide
          border-t-2
          mx-4 pt-0
          class="zen-hide"
        >
          <DrawerTrends v-if="isHydrated && currentUser && props.showTrendingPosts" />
          <DrawerNotifications v-if="isHydrated && currentUser && props.showNotifications" />
        </div>
      </div>
      <div flex-auto />
      <div hidden lg="grid flex-col sticky bottom-0 bg-base h-fit">
        <PwaPrompt />
        <PwaInstallPrompt />
        <LazyCommonPreviewPrompt v-if="info.env === 'preview'" />
        <NavFooter />
      </div>
    </div>
  </nav>
</template>
