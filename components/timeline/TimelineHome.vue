<script setup lang="ts">
import type { mastodon } from 'masto'
import { useFeeds } from '~/composables/discovery'

const paginator = useMastoClient().v1.timelines.listHome({ limit: 15 })
const stream = useStreaming(client => client.v1.stream.streamUser())
const processableItems = ref<mastodon.v1.Status[]>([])

const excludeMissingAltTextInHome = usePreferences('excludeMissingAltTextInHome')
const excludeBoostsInHome = usePreferences('excludeBoostsInHome')
const excludeBotsInHome = usePreferences('excludeBotsInHome')
const excludeDMsInHome = usePreferences('excludeDMsInHome')
const excludeNonThreadRepliesInHome = usePreferences('excludeNonThreadRepliesInHome')
const excludeThreadRepliesInHome = usePreferences('excludeThreadRepliesInHome')
const excludeCWsInHome = usePreferences('excludeCWsInHome')
const excludeSexuallyExplicitInHome = usePreferences('excludeSexuallyExplicitInHome')
const excludeTwitterBacklinksInHome = usePreferences('excludeTwitterBacklinksInHome')
const excludeTwitterCrosspostsInHome = usePreferences('excludeTwitterCrosspostsInHome')
const experimentalAntagonistFilterLevel = usePreferences('experimentalAntagonistFilterLevel')

const { data: feeds } = useAsyncData(
  async () => {
    if (process.dev) {
      if (!processableItems.value || processableItems.value.length === 0)
        return useFeeds()
    }

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
      excludeMissingAltTextInHome,
      excludeBoostsInHome,
      excludeBotsInHome,
      excludeDMsInHome,
      excludeNonThreadRepliesInHome,
      excludeThreadRepliesInHome,
      excludeCWsInHome,
      excludeSexuallyExplicitInHome,
      excludeTwitterBacklinksInHome,
      excludeTwitterCrosspostsInHome,
      experimentalAntagonistFilterLevel,
      currentUser,
    ],
    immediate: true,
    default: () => shallowRef(useFeeds()),
  },
)

function preprocessHomeFeed(_items: mastodon.v1.Status[]) {
  // Avoid updating processableItems unless that's going to change the feed logic
  if (experimentalAntagonistFilterLevel.value === 5) {
    processableItems.value = _items.filter(feeds.value.shouldBeInHome)

    return preprocessTimeline([...processableItems.value], 'home')
  }
  else {
    return preprocessTimeline(_items.filter(useFeeds().shouldBeInHome), 'home')
  }
}
</script>

<template>
  <template v-if="!!currentUser">
    <div>
      <PublishWidget draft-key="home" border="b base" />
      <TimelinePaginator v-bind="{ paginator, stream }" :preprocess="preprocessHomeFeed" :buffer="1" context="home" />
    </div>
  </template>
</template>
