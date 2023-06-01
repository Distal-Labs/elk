<script setup lang="ts">
import type { mastodon } from 'masto'

const paginator = useMastoClient().v1.conversations.list()
const stream = $(useStreaming(client => client.v1.stream.streamDirectTimeline()))
function reorderAndFilter(items: mastodon.v1.Conversation[]) {
  return filteredAndOrderedConversations(items)
}
</script>

<template>
  <ConversationPaginator v-bind="{ paginator, stream }" :preprocess="reorderAndFilter" context="home" />
</template>
