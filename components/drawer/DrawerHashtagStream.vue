<script setup lang="ts">
import type { mastodon } from 'masto'
import { useFeeds } from '~/composables/discovery'

const { isLoading, selectedTagName } = defineProps<{
  selectedTagName: string
  isLoading: boolean
}>()

const tagName = $$(selectedTagName)
const paginator = useMastoClient().v1.timelines.listHashtag(tagName.value, { limit: 15 })
const stream = $(useStreaming(client => client.v1.stream.streamTagTimeline(tagName.value)))
const processableItems = ref<mastodon.v1.Status[]>([])

const excludeMissingAltTextInGlobal = usePreferences('excludeMissingAltTextInGlobal')
const excludeBoostsInGlobal = usePreferences('excludeBoostsInGlobal')
const excludeBotsInGlobal = usePreferences('excludeBotsInGlobal')
const excludeThreadRepliesInGlobal = usePreferences('excludeThreadRepliesInGlobal')
const excludeCWsInGlobal = usePreferences('excludeCWsInGlobal')
const excludeSexuallyExplicitInGlobal = usePreferences('excludeSexuallyExplicitInGlobal')
const excludeSpammersInGlobal = usePreferences('excludeSpammersInGlobal')
const experimentalAntagonistFilterLevel = usePreferences('experimentalAntagonistFilterLevel')

const { data: feeds } = useAsyncData(
  async () => {
    if (!processableItems.value || processableItems.value.length === 0)
      return useFeeds()

    if (
      (experimentalAntagonistFilterLevel.value < 5)
    ) {
      return useFeeds()
    }

    else {
      const relationships: mastodon.v1.Relationship[] = await useMastoClient().v1.accounts.fetchRelationships(processableItems.value.map(x => x.account.id))
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
      excludeMissingAltTextInGlobal,
      excludeBoostsInGlobal,
      excludeBotsInGlobal,
      excludeThreadRepliesInGlobal,
      excludeCWsInGlobal,
      excludeSexuallyExplicitInGlobal,
      excludeSpammersInGlobal,
      experimentalAntagonistFilterLevel,
      currentUser,
    ],
    immediate: true,
    default: () => shallowRef(useFeeds()),
  },
)

function preprocessTagTimeline(_items: mastodon.v1.Status[]): mastodon.v1.Status[] {
  // Avoid updating processableItems unless that's going to change the feed logic
  if (experimentalAntagonistFilterLevel.value === 5) {
    processableItems.value = _items.filter(feeds.value.shouldBeInGlobal)

    return preprocessTimeline([...processableItems.value], 'public')
  }
  else {
    return preprocessTimeline(_items.filter(useFeeds().shouldBeInGlobal), 'public')
  }
}
</script>

<template>
  <template v-if="currentUser && isHydrated">
    <div v-if="paginator && stream" max-h-100vh overscroll-y-contain overflow-y-auto>
      <TimelinePaginator v-bind="{ paginator, stream }" :preprocess="preprocessTagTimeline" :buffer="8" :is-compact="true" context="public" />
    </div>
  </template>
</template>
