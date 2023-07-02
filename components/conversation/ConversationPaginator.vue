<script setup lang="ts">
// @ts-expect-error missing types
import { DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import type { Paginator, WsEvents, mastodon } from 'masto'

const { paginator, stream, preprocess } = defineProps<{
  paginator: Paginator<mastodon.v1.Conversation[], mastodon.DefaultPaginationParams>
  stream?: Promise<WsEvents>
  preprocess?: (items: mastodon.v1.Conversation[]) => mastodon.v1.Conversation[]
}>()

const virtualScroller = false // $(usePreferences('experimentalVirtualScroller'))

const { formatNumber } = useHumanReadableNumber()
</script>

<template>
  <CommonPaginator v-bind="{ paginator, stream, preprocess, endMessage: 'End of messages that meet your filter criteria' }" :buffer="0" :virtual-scroller="virtualScroller">
    <template #updater="{ number, update }">
      <button py-4 border="b base" flex="~ col" p-3 w-full text-primary font-bold @click="update">
        {{ $t('timeline.show_new_items', number, { named: { v: formatNumber(number) } }) }}
      </button>
    </template>
    <template #default="{ item, active }">
      <template v-if="virtualScroller">
        <DynamicScrollerItem :item="item" :active="active" tag="div">
          <ConversationCard
            :conversation="item"
            border="b base" py-1
          />
        </DynamicScrollerItem>
      </template>
      <template v-else>
        <ConversationCard
          :conversation="item"
          border="b base" py-1
        />
      </template>
    </template>
  </CommonPaginator>
</template>
