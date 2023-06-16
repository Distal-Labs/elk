<script setup lang="ts">
import type { mastodon } from 'masto'
import type { DrawerContextOptionsType, DrawerContextType } from '~/types'

const { drawerContext, changeContext, trendSource, posts, tags, isLoading, label, selectedTagName } = withDefaults(
  defineProps<{
    drawerContext: DrawerContextType
    changeContext: (context: DrawerContextType, options?: DrawerContextOptionsType) => void
    trendSource: 'feditrends' | 'fedified'
    posts?: mastodon.v1.Status[]
    tags?: mastodon.v1.Tag[]
    selectedTagName?: string | null
    isLoading: boolean
    label: string
  }>(),
  {
    selectedTagName: null,
    isLoading: false,
    label: '',
  })

const isSourceFeditrends = $computed(() => trendSource && (trendSource === 'feditrends'))
</script>

<template v-if="isHydrated && currentUser">
  <div rounded-4 p0 m0>
    <div flex="~ row 1" min-w-full>
      <div
        flex flex-wrap
        w-full
      >
        <div flex-none w-full pb2>
          <span pt3 flex="~ col" w-full text-current font-800 text-size-xl>
            {{ label }}
          </span>
          <NuxtLink v-if="isSourceFeditrends" href="https://feditrends.com" external target="_blank">
            <span v-if="isSourceFeditrends" flex="~ col" w-full pt1 text-sm text-secondary leading-snug>
              Courtesy of Feditrends
            </span>
          </NuxtLink>
        </div>
      </div>
      <div
        flex flex-none
        w-fit
      >
        <DrawerMenu
          :drawer-context="drawerContext"
          :change-context="changeContext"
          :tags="tags"
          :selected-tag-name="selectedTagName"
          :is-update-in-progress="isLoading"
        />
      </div>
    </div>
    <div v-if="isHydrated && (drawerContext === 'tags')">
      <DrawerHashtagStream :is-loading="isLoading" :featured-tag-name="selectedTagName" />
    </div>
    <div v-else-if="isHydrated && (drawerContext === 'posts')" max-h-70vh overscroll-y-contain overflow-y-auto>
      <div max-h-fit overscroll-y-contain overflow-y-auto>
        <template v-for="item in posts" :key="item?.uri">
          <div px0 py4 me-3>
            <StatusQuoteCard :status="item" context="account" :actions="true" :in-drawer="true" :in-notification="true" />
          </div>
        </template>
        <div p5 text-secondary italic text-center>
          {{ $t('common.end_of_list') }}
        </div>
      </div>
    </div>
    <div v-else max-h-fit overscroll-y-contain overflow-y-auto />
  </div>
</template>
