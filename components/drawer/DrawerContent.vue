<script setup lang="ts">
import type { DrawerContextOptionsType, DrawerContextType } from '~/types'

const info = useBuildInfo()

const drawerContext = ref<DrawerContextType>('posts')

const { posts: trendingPosts, isPostUpdateInProgress, tags: trendingTags, featuredTagName: selectedTagName, selectFeaturedTag, isTagUpdateInProgress, trendSource, updateTrends } = $(useTrends())

function selectTag(tagName: string) {
  selectFeaturedTag(tagName)
}

function changeContext(context: DrawerContextType, options?: DrawerContextOptionsType) {
  drawerContext.value = context

  if (options && options.tag)
    selectTag(options.tag.name)
}

const cardLabel = computed(() => {
  if (isTagUpdateInProgress || isPostUpdateInProgress)
    return 'Loading trends...'

  if (drawerContext.value === 'discover-accounts')
    return 'Who to follow'

  if (drawerContext.value === 'tags' && selectedTagName)
    return `Trending: #${selectedTagName}`

  if (drawerContext.value === 'posts')
    return 'Trending posts'

  return 'What\'s trending'
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
              hidden lg="block mx0 pt0"
              :trend-source="trendSource"
              :drawer-context="drawerContext"
              :change-context="changeContext"
              :posts="trendingPosts"
              :tags="trendingTags.slice(0, 5)"
              :selected-tag-name="selectedTagName ?? ''"
              :is-loading="isTagUpdateInProgress || isPostUpdateInProgress"
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
