<script setup lang="ts">
import type { mastodon } from 'masto'

const paginator = useMastoClient().v1.timelines.listPublic({ limit: 200 })
const stream = useStreaming(client => client.v1.stream.streamPublicTimeline())
function reorderAndFilter(items: mastodon.v1.Status[]) {
  return reorderedTimeline(items, 'public', true)
}
</script>

<template>
  <div>
    <TimelinePaginator v-bind="{ paginator, stream }" :preprocess="reorderAndFilter" context="public" />
  </div>
</template>
