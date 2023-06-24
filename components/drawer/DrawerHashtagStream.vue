<script setup lang="ts">
import type { mastodon } from 'masto'

const { isLoading, featuredTagName } = defineProps<{
  featuredTagName: string | null
  isLoading: boolean
}>()

function reorderAndFilter(items: mastodon.v1.Status[]) {
  return reorderedTimeline(items, 'public')
}

const paginator = useMastoClient().v1.timelines.listHashtag(featuredTagName ?? '')

const stream = useStreaming(client => client.v1.stream.streamTagTimeline(featuredTagName ?? ''))
</script>

<template v-if="isHydrated">
  <div v-if="paginator && stream" max-h-100vh overscroll-y-contain overflow-y-auto>
    <TimelinePaginator v-show="stream" v-bind="{ paginator, stream }" :preprocess="reorderAndFilter" context="home" :is-compact="true" />
  </div>
</template>
