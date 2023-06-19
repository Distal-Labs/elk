<script setup lang="ts">
// @ts-expect-error missing types
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import type { ComponentPublicInstance } from 'vue'
import type { mastodon } from 'masto'
import { provide, ref } from 'vue'
import { attachQuoteImageToDraft, domToCanvas, isQuotable } from '../../../composables/quote'

definePageMeta({
  name: 'status',
  key: route => route.path,
  // GoToSocial
  alias: ['/:server?/@:account/statuses/:status'],
})

const route = useRoute()
const id = $(computedEager(() => route.params.status as string))
const main = ref<ComponentPublicInstance | null>(null)

const { data: status, pending, refresh: refreshStatus } = useAsyncData(
  `status:${id}`,
  () => fetchStatus(id),
  { watch: [isHydrated], immediate: isHydrated.value, default: () => shallowRef() },
)
const { client } = $(useMasto())
const { data: context, pending: pendingContext, refresh: refreshContext } = useAsyncData(
  `context:${id}`,
  async () => client.v1.statuses.fetchContext(id),
  { watch: [isHydrated], immediate: isHydrated.value, lazy: true, default: () => shallowRef() },
)

if (pendingContext)
  watchOnce(pendingContext, scrollTo)

if (pending)
  watchOnce(pending, scrollTo)

async function scrollTo() {
  await nextTick()

  const statusElement = unrefElement(main)
  if (!statusElement)
    return

  statusElement.scrollIntoView(true)
}

const publishWidget = ref()
function focusEditor() {
  return publishWidget.value?.focusEditor?.()
}

provide('focus-editor', focusEditor)

const replyDraft = $computed(() => status.value ? getReplyDraft(status.value) : null)

const qStatus = $computed(() => {
  if (status.value) {
    const aStatus = (status.value as mastodon.v1.Status)
    if (aStatus.reblog && (!aStatus.content || aStatus.content === aStatus.reblog.content))
      return aStatus.reblog
    return aStatus
  }
})

async function attachQuote(file: any): Promise<boolean> {
  if (qStatus) {
    const didAttachOperationSucceed: boolean = await attachQuoteImageToDraft(file, publishWidget, qStatus)
    return didAttachOperationSucceed
  }
  else {
    return false
  }
}

const isBeingQuoted = ref<boolean>(false)
function quoteRemoved() {
  isBeingQuoted.value = false
}

function detachQuote() {
  publishWidget.value?.detachQuoteFromDraft()
  isBeingQuoted.value = false
}

const isQuotableStatus = $computed(() => isQuotable(qStatus))

async function toggleQuote<T extends Node>(quotableElement: T) {
  if (isBeingQuoted.value === false) {
    if (quotableElement) {
      const colorMode = useColorMode()
      const quoteBackgroundColor = computed(() => {
        switch (colorMode.value) {
          case 'light':
            return '#fafafa'
          case 'dim':
            return '#1a202c'
          case 'dark':
            return '#111111'
        }
      })
      const canvasWithQuote = await domToCanvas(quotableElement, {
        backgroundColor: quoteBackgroundColor.value,
        scale: 1.0,
        font: {
          preferredFormat: 'woff',
        },
      })
      canvasWithQuote.toBlob(async (blob: Blob | null) => {
        if (blob) {
          isBeingQuoted.value = true
          isBeingQuoted.value = await attachQuote(blob)
        }
        else {
          isBeingQuoted.value = false
        }
      })
    }
  }
  else {
    detachQuote()
  }
}

function updateQuotableElement<T extends Node>(el?: T) {
  if (main.value && window.history.state.quote && isQuotableStatus && !isBeingQuoted.value && el) {
    publishWidget.value?.focusEditor?.()
    return toggleQuote(el)
  }
}

provide('update-quotable-element', updateQuotableElement)

watch(publishWidget, () => {
  if (window.history.state.focusReply)
    focusEditor()
})

onReactivated(() => {
  // Silently update data when reentering the page
  // The user will see the previous content first, and any changes will be updated to the UI when the request is completed
  refreshStatus()
  refreshContext()
})
</script>

<template>
  <MainContent back>
    <template v-if="!pending">
      <template v-if="status">
        <div xl:mt-4 mb="50vh" border="b base">
          <template v-if="!pendingContext">
            <StatusCard
              v-for="comment, i of context?.ancestors" :key="comment.id"
              :status="comment" :actions="comment.visibility !== 'direct'" context="account"
              :has-older="true" :newer="context?.ancestors[i - 1]"
              :is-being-quoted="isBeingQuoted"
              :toggle-quote="toggleQuote"
            />
          </template>

          <StatusDetails
            ref="main"
            :status="status"
            :newer="context?.ancestors.at(-1)"
            :reply-draft="replyDraft?.draft"
            :is-being-quoted="isBeingQuoted"
            :toggle-quote="toggleQuote"
            command
            style="scroll-margin-top: 60px"
            @refetch-status="refreshStatus()"
          />
          <PublishWidget
            v-if="replyDraft"
            ref="publishWidget"
            border="y base"
            :draft-key="replyDraft!.key"
            :initial="replyDraft!.draft"
            :quote-removed="quoteRemoved"
            @published="refreshContext()"
          />

          <template v-if="!pendingContext">
            <DynamicScroller
              v-slot="{ item, index, active }"
              :items="context?.descendants || []"
              :min-item-size="200"
              :buffer="800"
              key-field="id"
              page-mode
            >
              <DynamicScrollerItem :item="item" :active="active">
                <StatusCard
                  :status="item"
                  context="account"
                  :older="context?.descendants[index + 1]"
                  :newer="index > 0 ? context?.descendants[index - 1] : status"
                  :has-newer="index === 0"
                  :main="status"
                  :is-being-quoted="isBeingQuoted"
                  :toggle-quote="toggleQuote"
                />
              </DynamicScrollerItem>
            </DynamicScroller>
          </template>
        </div>
      </template>

      <StatusNotFound v-else :account="route.params.account as string" :status="id" />
    </template>

    <StatusCardSkeleton v-else border="b base" />
    <TimelineSkeleton v-if="pending || pendingContext" />
  </MainContent>
</template>
