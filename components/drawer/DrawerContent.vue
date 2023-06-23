<script setup lang="ts">
import type { DrawerContextOptionsType, DrawerContextType } from '~/types'

const info = useBuildInfo()

const drawerContext = ref<DrawerContextType>('posts')

const { posts: trendingPosts, isPostUpdateInProgress, tags: trendingTags, featuredTagName, selectFeaturedTag, isTagUpdateInProgress, trendSource, updateTrends } = useTrends()

const isLoading = computed(() => (isTagUpdateInProgress.value || isPostUpdateInProgress.value))

function selectTag(tagName: string) {
  selectFeaturedTag(tagName)
}

function changeContext(context: DrawerContextType, options?: DrawerContextOptionsType) {
  drawerContext.value = context

  if (options && options.tag)
    selectTag(options.tag.name)
}

const cardLabel = computed(() => {
  if (isPostUpdateInProgress.value || isTagUpdateInProgress.value)
    return 'Loading trends...'

  if (drawerContext.value === 'discover-accounts')
    return 'Who to follow'

  if (drawerContext.value === 'tags' && featuredTagName.value)
    return `Trending: #${featuredTagName.value}`

  if (drawerContext.value === 'posts')
    return 'Trending posts'

  return 'What\'s trending'
})

watch(
  currentUser,
  () => initializeTrends(true),
)

watch(
  [isHydrated],
  () => isHydrated.value ? updateTrends(false) : undefined,
)

onReactivated(() => {
  // Force update data when reactivating
  updateTrends(true)
})
</script>

<template>
  <nav overflow-y-hidden>
    <div hidden lg="h-full grid grid-rows-[minmax(0,90vh)_auto_auto] gap-4 overflow-y-hidden">
      <div flex="~ col" justify-between h-full w-full overflow-y-hidden>
        <div v-if="isHydrated && currentUser" hidden lg="grid grid-rows-0" overflow-y-hidden class="zen-hide">
          <div
            v-if="isHydrated && currentUser"
            overflow-y-hidden
            mx-0
            pt-0 ps-4 pe-1
            rounded-4
            bg-card
            class="zen-hide"
          >
            <DrawerTimeline
              v-if="isHydrated && trendingPosts && trendingTags && drawerContext && ['posts', 'tags', 'discover-accounts'].includes(drawerContext)" hidden lg="block mx0 pt0"
              :trend-source="trendSource"
              :drawer-context="drawerContext"
              :change-context="changeContext"
              :posts="trendingPosts"
              :tags="trendingTags.slice(0, 5)"
              :selected-tag-name="featuredTagName"
              :is-loading="isLoading"
              :label="cardLabel"
            />
          </div>
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
