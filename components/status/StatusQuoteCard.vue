<script setup lang="ts">
import type { mastodon } from 'masto'

const props = withDefaults(defineProps<{
  status: mastodon.v1.Status
  actions: boolean
  inNotification: boolean
  isBeingQuoted?: boolean
  toggleQuote?: <T extends Node>(quotableElement: T) => Promise<void>
}>(), {
  actions: false,
  inNotification: false,
})

const userSettings = useUserSettings()

const status: mastodon.v1.Status = $computed(() => props.status)

const linkToStatus: URL = $computed(() => new URL(status.uri))
const acct: string = $computed(() => (window.location.hostname === linkToStatus.host) ? linkToStatus.pathname.split('/')[1].replace('@', '') : `${linkToStatus.pathname.split('/')[1].replace('@', '')}@${linkToStatus.hostname}`)
const username: string = $computed(() => status.account.username)
const serverName: string = $computed(() => acct.split('@')[1])

const timeAgoOptions = useTimeAgoOptions(true)
const timeago = useTimeAgo(() => status.createdAt, timeAgoOptions)
// const isQuotableStatus = $computed(() => isQuotable(status))
// const explainIsQuotableStatus = $computed(() => explainIsQuotable(status))

// Content Filter logic
const filterResult = $computed(() => status.filtered?.length ? status.filtered[0] : null)
const filter = $computed(() => filterResult?.filter)

const filterPhrase = $computed(() => filter?.title)
const isFiltered = $computed(() => (status.account.id !== currentUser?.value?.account?.id) && (filterPhrase !== undefined))

// check spoiler text or media attachment
// needed to handle accounts that mark all their posts as sensitive
const spoilerTextPresent = $computed(() => !!status.spoilerText && status.spoilerText.trim().length > 0)
const hasSpoilerOrSensitiveMedia = $computed(() => spoilerTextPresent || (status.sensitive && !!status.mediaAttachments.length))
const isSensitiveNonSpoiler = computed(() => status.sensitive && !status.spoilerText && !!status.mediaAttachments.length)
const hideAllMedia = computed(
  () => {
    return currentUser.value ? (getHideMediaByDefault(currentUser.value.account) && !!status.mediaAttachments.length) : false
  },
)

const statusRoute = $computed(() => getStatusRoute(status))
const router = useRouter()

function go(evt: MouseEvent | KeyboardEvent) {
  if (evt.metaKey || evt.ctrlKey) {
    window.open(statusRoute.href)
  }
  else {
    cacheStatus(status)
    router.push(statusRoute)
  }
}
</script>

<template v-if="status.account">
  <div
    flex flex-col
    display-block of-hidden
    bg-code
    relative
    w-full
    justify-start
    rounded-2xl
    class="border-width-[0.05rem] border-[var(--c-text-secondary)]"
  >
    <div
      p4 flex flex-col justify-between
      basis-50 flex-auto min-h-fit max-h-fit
    >
      <!-- START -->
      <!-- Account Info -->
      <div flex basis-full flex-nowrap items-center space-x-2>
        <AccountHoverWrapper :account="status.account" flex basis-full flex-nowrap items-center space-x-2>
          <NuxtLink
            :to="getAccountRoute(status.account)"
            flex="~ row gap-2"
            flex-nowrap
            items-center
            text-link-rounded
          >
            <div flex="~ row gap-2" grow flex-nowrap items-center justify-items-start align-baseline min-w-fit max-w-fit font-bold text-primary>
              <AccountAvatar
                :account="status.account" :square="false"
                basis-1em flex-auto max-w-5 line-clamp-1 ws-pre-wrap
              />
              <AccountDisplayName
                :account="status.account" :hide-emojis="getPreferences(userSettings, 'hideUsernameEmojis')"
                flex-none min-w-fit max-w-fit font-bold line-clamp-1 ws-pre-wrap break-all text-primary
              />
              <AccountBotIndicator
                v-if="status.account.bot"
                flex-none min-w-fit max-w-fit me-1
              />
            </div>

            <div flex="~ row gap-2" shrink min-w-0 flex-nowrap items-start align-baseline max-w-fit class="zen-none">
              <div flex="~ row gap-0" basis-0 grow min-w-0 flex-nowrap items-start align-baseline max-w-fit line-clamp-1 ws-pre-wrap class="zen-none">
                <div min-w-content>
                  <span text-secondary>{{ username }}</span>
                </div>
                <div v-if="serverName" basis-0 grow min-w-0 max-w-fit flex-nowrap items-start align-baseline>
                  <span line-clamp-1 overflow-x-hidden text-secondary font-thin p0 m0 break-all>@{{ serverName }}</span>
                </div>
                <div flex-none items-start align-baseline min-w-fit line-clamp-1 class="zen-none">
                  <span text-secondary text-secondary-light> &bull; {{ timeago }}</span>
                </div>
              </div>
            </div>

            <div flex-auto />
          </NuxtLink>
        </AccountHoverWrapper>
        <StatusActionsMore :status="status" :details="false" :command="false" :hide-favorited-and-boosted-by="false" :hide-mention-account="false" me--2 />
      </div>
      <!-- Content -->
      <div space-y-3 my-2>
        <NuxtLink :href="statusRoute.href" block @click.prevent="go($event)">
          <StatusBody :status="status" :with-action="false" class="font-light" />
        </NuxtLink>
        <StatusSpoiler :enabled="hasSpoilerOrSensitiveMedia || isFiltered" :filter="isFiltered" :sensitive-non-spoiler="isSensitiveNonSpoiler || hideAllMedia" :is-d-m="false">
          <template v-if="spoilerTextPresent" #spoiler>
            <p>{{ status.spoilerText }}</p>
          </template>
          <template v-else-if="filterPhrase" #spoiler>
            <p>{{ `${$t('status.filter_hidden_phrase')}: ${filterPhrase}` }}</p>
          </template>
          <NuxtLink :href="statusRoute.href" block @click.prevent="go($event)">
            <StatusBody v-if="(!isFiltered && isSensitiveNonSpoiler) || hideAllMedia" :status="status" :with-action="false" class="font-light" />
          </NuxtLink>
          <StatusTranslation :status="status" />
          <StatusPoll v-if="status.poll" :status="status" />
          <StatusMedia
            v-if="status.mediaAttachments?.length"
            :status="status"
          />
          <StatusPreviewCard
            v-if="status.card"
            :card="status.card"
            :small-picture-only="status.mediaAttachments?.length > 0"
          />
        </StatusSpoiler>
      </div>
      <!-- <StatusActions
        v-if="actions !== false"
        v-show="!getPreferences(userSettings, 'zenMode')"
        :status="status"
        :is-quotable-status="isQuotableStatus"
        :explain-is-quotable-status="explainIsQuotableStatus"
        :is-being-quoted="props.isBeingQuoted"
      /> -->
      <!-- END -->
      <div flex justify-between>
        <div />
        <NuxtLink
          :href="statusRoute.href"
          block
          of-hidden
          bg-card
          hover:bg-active
          rounded-2
          @click.prevent="go($event)"
        >
          <div text-2xl i-ri:mastodon-fill text-secondary />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
