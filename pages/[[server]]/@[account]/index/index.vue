<script setup lang="ts">
import type { mastodon } from 'masto'

const params = useRoute().params
const handle = $(computedEager(() => params.account as string))

definePageMeta({ name: 'account-index' })

const { t } = useI18n()

const account = await fetchAccountByHandle(handle)

function preprocess(items: mastodon.v1.Status[]) {
  return preprocessTimeline(items, 'account')
}

const paginator = account ? useMastoClient().v1.accounts.listStatuses(account.id, { limit: 30, excludeReplies: true }) : undefined

if (account) {
  useHydratedHead({
    title: () => `${t('account.posts')} | ${getDisplayName(account)} (@${account.acct})`,
  })
}
</script>

<template>
  <div>
    <AccountTabs />
    <template v-if="paginator && account">
      <TimelinePaginator :paginator="paginator" :preprocess="preprocess" context="account" :account="account" />
    </template>
  </div>
</template>
