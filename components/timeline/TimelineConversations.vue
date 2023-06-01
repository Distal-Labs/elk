<script setup lang="ts">
const paginator = useMastoClient().v1.conversations.list()
const stream = $(useStreaming(client => client.v1.stream.streamDirectTimeline()))
</script>

<template>
  <ConversationPaginator v-bind="{ paginator, stream }" />
</template>
