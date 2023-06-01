<script setup lang="ts">
import type { mastodon } from 'masto'

const { conversation } = defineProps<{
  conversation: mastodon.v1.Conversation
}>()

const withAccounts = $computed(() =>
  conversation.accounts.filter(account => account.id !== conversation.lastStatus?.account.id),
)

const { isConversationUnread } = useConversations()
const isUnread = ref<boolean | undefined>(undefined)

onMounted(() => isUnread.value = isConversationUnread(conversation.id))
</script>

<template>
  <article
    v-if="conversation.lastStatus"
    flex flex-col gap-2
  >
    <StatusCard
      v-if="conversation.lastStatus"
      :status="conversation.lastStatus"
      :actions="true"
      :class="[isUnread ? 'bg-active' : '']"
    >
      <template #meta>
        <div flex gap-2 text-sm text-secondary font-bold>
          <p me-1>
            {{ $t('conversation.with') }}
          </p>
          <AccountAvatar v-for="account in withAccounts" :key="account.id" h-5 w-5 :account="account" />
        </div>
      </template>
    </StatusCard>
  </article>
</template>
