<script lang="ts" setup>
import type { mastodon } from 'masto'

const { account, as = 'div' } = $defineProps<{
  account: mastodon.v1.Account
  as?: string
}>()

cacheAccount(account)

defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <div
    flex flex-col
    display-block of-hidden
    bg-code
    relative
    w-full
    justify-start
    rounded-2xl
    class="border-width-[0_0_0_0.01em] border-[var(--c-text-secondary)]"
    shadow="~ sm current"
  >
    <!-- class="border-width-[0_0.025rem_0.05rem_0] border-[var(--c-text-secondary)]" -->
    <component :is="as" block focus:outline-none focus-visible:ring="2 primary" v-bind="$attrs">
      <!-- Banner -->
      <div px0 pt0>
        <div rounded-t-2xl of-hidden bg="gray-500/20" aspect="3.19">
          <img h-full w-full object-cover :src="account.header" :alt="$t('account.profile_description', [account.username])">
        </div>
      </div>
      <div px-4 pb-4 space-y-2>
        <!-- User info -->
        <div flex sm:flex-row flex-col flex-gap-2>
          <div flex items-center justify-between>
            <div w-17 h-17 rounded-full border-4 border-bg-base z-2 mt--2 ms--1>
              <AccountAvatar :account="account" />
            </div>
          </div>
          <div sm:mt-2>
            <AccountDisplayName :account="account" font-bold text-lg line-clamp-1 ws-pre-wrap break-all />
            <AccountHandle text-sm :account="account" />
          </div>
        </div>
        <!-- Note -->
        <div v-if="account.note" max-h-100 overflow-y-auto>
          <ContentRich
            :content="account.note" :emojis="account.emojis"
          />
        </div>
        <!-- Account statistics -->
        <div flex justify-between items-center overflow-x-hidden>
          <AccountPostsFollowers text-sm :account="account" :is-compact-card="true" />
        </div>
        <!-- Follow CTA -->
        <div flex justify-between items-center pt4 pb0>
          <NuxtLink href="javascript:;" w-full @click.stop>
            <AccountFollowButton :account="account" w-full py1 text-xl font-extrabold />
          </NuxtLink>
        </div>
      </div>
    </component>
  </div>
</template>
