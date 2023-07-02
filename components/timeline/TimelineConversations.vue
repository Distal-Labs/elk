<script setup lang="ts">
import type { mastodon } from 'masto'
import { useFeeds } from '~/composables/discovery'

const paginator = useMastoClient().v1.conversations.list({ limit: 10 })
const stream = $(useStreaming(client => client.v1.stream.streamDirectTimeline()))
const processableItems = ref<mastodon.v1.Conversation[]>([])

const excludeUnfamiliarAccountsInMessages = usePreferences('excludeUnfamiliarAccountsInMessages')
const experimentalAntagonistFilterLevel = usePreferences('experimentalAntagonistFilterLevel')

const { data: feeds } = useAsyncData(
  async () => {
    if (!processableItems.value || processableItems.value.length === 0)
      return useFeeds()

    if (
      (!excludeUnfamiliarAccountsInMessages.value)
      && (experimentalAntagonistFilterLevel.value < 5)
    ) {
      return useFeeds()
    }

    else {
      const relationships: mastodon.v1.Relationship[] = await useMastoClient().v1.accounts.fetchRelationships(processableItems.value.flatMap(_ => (_.accounts).filter(x => !x.suspended).map(x => x.id)))
        .then(rels => rels)
        .catch((e) => {
          if (process.dev)
            console.error('Unable to retrieve relationships', (e as Error).message)
          return []
        })

      return useFeeds(relationships)
    }
  },
  {
    watch: [
      processableItems,
      excludeUnfamiliarAccountsInMessages,
      experimentalAntagonistFilterLevel,
      currentUser,
    ],
    immediate: true,
    default: () => shallowRef(useFeeds()),
  },
)

function preprocessConversations(_items: mastodon.v1.Conversation[]): mastodon.v1.Conversation[] {
  if (!currentUser.value)
    return Array<mastodon.v1.Conversation>()

  // Avoid updating processableItems unless that's going to change the feed logic
  if (
    (excludeUnfamiliarAccountsInMessages.value === true)
    || (experimentalAntagonistFilterLevel.value === 5)
  ) {
    processableItems.value = [..._items]

    return applyConversationFilterContext([...processableItems.value].filter(useFeeds().shouldBeInConversations))
  }
  else {
    return applyConversationFilterContext(_items.filter(useFeeds().shouldBeInConversations))
  }
}
</script>

<template>
  <template v-if="!!currentUser">
    <ConversationPaginator v-bind="{ paginator, stream }" :preprocess="preprocessConversations" />
  </template>
</template>
