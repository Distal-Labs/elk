<script setup lang="ts">
import type { mastodon } from 'masto'
import { inject, ref } from 'vue'
import { explainIsQuotable, isQuotable } from '../../composables/quote'

const props = withDefaults(defineProps<{
  status: mastodon.v1.Status
  newer?: mastodon.v1.Status
  command?: boolean
  actions?: boolean
  isBeingQuoted?: boolean
  toggleQuote?: <T extends Node>(quotableElement: T) => Promise<void>
}>(), {
  actions: true,
  triggerQuote: false,
})

defineEmits<{
  (event: 'refetchStatus'): void
}>()

const status = $computed(() => {
  if (props.status.reblog && props.status.reblog)
    return props.status.reblog
  return props.status
})

const createdAt = useFormattedDateTime(status.createdAt)

const { t } = useI18n()

useHydratedHead({
  title: () => `${getDisplayName(status.account)} ${t('common.in')} ${t('app_name')}: "${removeHTMLTags(status.content) || ''}"`,
})

const isQuotableStatus = $computed(() => isQuotable(status))

const explainIsQuotableStatus = $computed(() => explainIsQuotable(status))

const quotableElement = ref<Node>()

const focusEditor = inject<typeof noop>('focus-editor', noop)
async function toggleQuote() {
  if (props.toggleQuote && quotableElement.value) {
    focusEditor()
    await props.toggleQuote(quotableElement.value)
  }
}

const updateQuotableElement = inject<<T extends Node>(el?: T) => void>('update-quotable-element', noop)
watch(quotableElement, () => {
  setTimeout(() => {
    updateQuotableElement(quotableElement.value)
  }, 2000)
},
{ immediate: false },
)
</script>

<template>
  <div :id="`status-${status.id}`" flex flex-col gap-2 pt2 pb1 ps-3 pe-4 relative :lang="status.language ?? undefined" aria-roledescription="status-details">
    <StatusActionsMore :status="status" absolute inset-ie-2 top-2 @after-edit="$emit('refetchStatus')" />
    <div ref="quotableElement" style="padding: 2rem;">
      <template v-if="currentUser">
        <NuxtLink :to="getAccountRoute(status.account)" rounded-full hover:bg-active transition-100 pe5 me-a>
          <AccountHoverWrapper :account="status.account">
            <AccountInfo :account="status.account" />
          </AccountHoverWrapper>
        </NuxtLink>
      </template>
      <template v-else>
        <NuxtLink :to="undefined" rounded-full hover:bg-active transition-100 pe5 me-a @click.prevent="checkLogin()">
          <AccountHoverWrapper :account="status.account" disabled>
            <AccountInfo :account="status.account" />
          </AccountHoverWrapper>
        </NuxtLink>
      </template>
      <StatusContent :status="status" :newer="newer" context="details" />
      <div flex="~ gap-1" items-center text-secondary text-sm>
        <div flex>
          <div>{{ createdAt }}</div>
          <StatusEditIndicator
            :status="status"
            :inline="false"
          >
            <span ms1 font-bold cursor-pointer>{{ $t('state.edited') }}</span>
          </StatusEditIndicator>
        </div>
        <div>&middot;</div>
        <StatusVisibilityIndicator :status="status" />
        <div v-if="status.application?.name">
          &middot;
        </div>
        <div v-if="status.application?.website && status.application.name">
          <NuxtLink :to="status.application.website">
            {{ status.application.name }}
          </NuxtLink>
        </div>
        <div v-else-if="status.application?.name">
          {{ status.application?.name }}
        </div>
      </div>
    </div>
    <div border="t base" py-2>
      <StatusActions
        v-if="actions"
        :status="status"
        details
        :command="command"
        :is-quotable-status="isQuotableStatus"
        :explain-is-quotable-status="explainIsQuotableStatus"
        :is-being-quoted="props.isBeingQuoted"
        :toggle-quote="toggleQuote"
      />
    </div>
  </div>
</template>
