<script setup lang="ts">
import type { mastodon } from 'masto'
import type { DrawerContextOptionsType, DrawerContextType } from '~/types'

const { drawerContext, changeContext, tags, selectedTagName } = defineProps<{
  drawerContext: DrawerContextType
  changeContext: (context: DrawerContextType, options?: DrawerContextOptionsType) => void
  tags?: mastodon.v1.Tag[]
  selectedTagName?: string | null
}>()

const emit = defineEmits<{
  (event: 'click'): void
}>()

function totalTrend(tag: mastodon.v1.Tag) {
  return tag.history?.reduce((total: number, item) => total + (Number(item.uses) || 0), 0)
}

function selectTrendingPosts() {
  changeContext('posts')
}

function selectTag(tag: mastodon.v1.Tag) {
  changeContext('tags', { tag })
}
</script>

<template>
  <div sm:min-w-80 max-w-100vw mxa py2 flex="~ col" @click="emit('click')">
    <span pt3 pb3 px4 flex="~ col" w-full text-current font-800 text-size-xl>What's happening</span>
    <template v-if="drawerContext !== 'posts'">
      <button
        flex rounded px4 py3 text-left
        hover:bg-active cursor-pointer transition-100
        aria-label="`Get real-time updates for #${tag.name}`"
        @click="selectTrendingPosts"
      >
        <div flex flex-row items-center gap2 relative>
          <div w-10 h-10 flex-none rounded-full bg-active flex place-items-center place-content-center>
            <div i-ri:fire-line text-secondary text-lg />
          </div>
          <div flex flex-col>
            <span font-bold>Trending Posts</span>
          </div>
        </div>
        <div flex-auto />
        <!-- <div v-if="drawerContext === 'posts'" i-ri:check-line text-primary mya ms-2 text-2xl /> -->
      </button>
    </template>
    <div v-if="drawerContext !== 'tags'" border="t base" pt2>
      <template v-for="tag of tags" :key="tag.name">
        <button
          flex rounded px4 py3 text-left
          hover:bg-active cursor-pointer transition-100
          aria-label="`Get real-time updates for #${tag.name}`"
          @click="selectTag(tag)"
        >
          <div flex flex-row items-center gap2 relative>
            <div w-10 h-10 flex-none rounded-full bg-active flex place-items-center place-content-center>
              <div i-ri:hashtag text-secondary text-lg />
            </div>
            <div flex flex-col>
              <span font-bold>
                {{ tag.name }}
              </span>
              <CommonTrending v-if="tag.history" :history="tag.history" :max-day="undefined" metric="posts" text-secondary truncate />
            </div>
            <div v-if="totalTrend(tag) && tag.history" absolute left-15 right-0 top-0 bottom-4 op35 flex place-items-center place-content-center ml-auto>
              <CommonTrendingCharts
                :history="tag.history" :width="150" :height="20"
                text-xs text-secondary h-full w-full
              />
            </div>
          </div>
          <div flex-auto />
          <!-- <div v-if="(drawerContext === 'tags') && (tag.name === selectedTagName)" i-ri:check-line text-primary mya ms-2 text-2xl /> -->
        </button>
      </template>
    </div>
  </div>
</template>
