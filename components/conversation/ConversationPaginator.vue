<script setup lang="ts">
// @ts-expect-error missing types
import { DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import type { Paginator, WsEvents, mastodon } from 'masto'

const { paginator, stream, buffer = 10, endMessage } = defineProps<{
  paginator: Paginator<mastodon.v1.Conversation[], mastodon.DefaultPaginationParams>
  stream?: Promise<WsEvents>
  context?: mastodon.v2.FilterContext
  preprocess?: (items: mastodon.v1.Conversation[]) => mastodon.v1.Conversation[]
  buffer?: number
  endMessage?: boolean | string
}>()

const { formatNumber } = useHumanReadableNumber()
const virtualScroller = false // $(usePreferences('experimentalVirtualScroller'))
</script>

<template>
  <CommonPaginator v-bind="{ paginator, stream, preprocess, buffer, endMessage }" :virtual-scroller="virtualScroller">
    <template #updater="{ number, update }">
      <button py-4 border="b base" flex="~ col" p-3 w-full text-primary font-bold @click="update">
        {{ $t('timeline.show_new_items', number, { named: { v: formatNumber(number) } }) }}
      </button>
    </template>
    <template #default="{ item, older, newer, active }">
      <template v-if="virtualScroller">
        <DynamicScrollerItem :item="item" :active="active" tag="article">
          <ConversationCard
            :conversation="item"
            :context="context" :older="older" :newer="newer"
            border="b base" py-1
          />
        </DynamicScrollerItem>
      </template>
      <template v-else>
        <ConversationCard
          :conversation="item"
          :context="context" :older="older" :newer="newer"
          border="b base" py-1
        />
      </template>
    </template>
  </CommonPaginator>
</template>
