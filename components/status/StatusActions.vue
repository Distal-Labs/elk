<script setup lang="ts">
import { inject } from 'vue'
import type { mastodon } from 'masto'
import { refAutoReset, refThrottled, watchImmediate } from '@vueuse/core'

const props = withDefaults(defineProps<{
  status: mastodon.v1.Status
  details?: boolean
  command?: boolean
  isCompact?: boolean
  isQuotableStatus?: boolean
  isBeingQuoted?: boolean
  explainIsQuotableStatus?: string
  toggleQuote?: () => Promise<void>
  isLastStatusInConversation?: boolean
  isDM?: boolean
  targetIsVisible?: boolean
  routeName?: string
}>(), {
  isCompact: false,
  isBeingQuoted: false,
  isQuotableStatus: false,
  explainIsQuotableStatus: 'This post is not quotable',
})

const focusEditor = inject<typeof noop>('focus-editor', noop)

const { details, command, isQuotableStatus, isBeingQuoted, explainIsQuotableStatus, toggleQuote } = $(props)

const userSettings = useUserSettings()
const useStarFavoriteIcon = usePreferences('useStarFavoriteIcon')

const {
  status: post,
  isLoading,
  canReblog,
  toggleBookmark,
  toggleFavourite,
  toggleReblog,
  isIncreasing,
} = $(useStatusActions(props))

const animateLoading = refAutoReset<{ favouritesCount: boolean; reblogsCount: boolean }>({ favouritesCount: false, reblogsCount: false }, 1000)
const animateIncreasing = ref<{ favouritesCount: boolean; reblogsCount: boolean }>({ favouritesCount: true, reblogsCount: true })
const _status = ref<mastodon.v1.Status>(props.status)
const status = refThrottled<mastodon.v1.Status>(_status, 1000, false, true)
const _targetIsVisible = ref<boolean>(props.targetIsVisible)
const targetIsVisible = refThrottled(_targetIsVisible, 1000, false, false)

watchImmediate([isLoading, isIncreasing, targetIsVisible], () => {
  if (props.targetIsVisible && (isLoading.favourited || isLoading.reblogged)) {
    animateLoading.value = { favouritesCount: isLoading.favourited, reblogsCount: isLoading.reblogged }
    animateIncreasing.value = isIncreasing
  }
})

watchImmediate(post, () => {
  if (props.routeName === 'status')
    return

  if (
    (post.favouritesCount !== props.status.favouritesCount)
    || (post.reblogsCount !== props.status.reblogsCount)
  )
    _status.value = post
})

const route = useRoute()

const { isConversationUnread, markConversationRead } = useConversations(route.name?.toString() ?? 'home')

const isStatusUnread = computed(() => isConversationUnread(status.value.id))

const isPartOfDMThread = $computed(() => props.isLastStatusInConversation || props.isDM || status.value.visibility === 'direct')

const quoteButtonTooltip = $computed((): string => {
  if (!isQuotableStatus)
    return explainIsQuotableStatus
  else
    return 'Quote this post'
})

async function quote() {
  if (!checkLogin())
    return
  if (details) {
    if ((isQuotableStatus) && (toggleQuote !== undefined))
      await toggleQuote()
    else
      console.error(quoteButtonTooltip)
  }
  else {
    navigateToStatus({ status: status.value, focusReply: false, quote: true })
  }
}

function reply() {
  if (!checkLogin())
    return
  if (details)
    focusEditor()
  else
    navigateToStatus({ status: status.value, focusReply: true, quote: false })
}
</script>

<template>
  <div flex justify-between items-center class="status-actions">
    <div flex-1>
      <StatusActionButton
        :content="$t('action.reply')"
        :text="!getPreferences(userSettings, 'hideReplyCount') && status.repliesCount || ''"
        color="text-blue" hover="text-blue" elk-group-hover="bg-blue/10"
        icon="i-ri:chat-1-line"
        :command="command"
        @click="reply"
      >
        <template v-if="status.repliesCount && !getPreferences(userSettings, 'hideReplyCount')" #text>
          <CommonLocalizedNumber
            keypath="action.reply_count"
            :count="status.repliesCount"
          />
        </template>
      </StatusActionButton>
    </div>

    <div v-if="!isCompact && !isPartOfDMThread" flex-1>
      <StatusActionButton
        :content="quoteButtonTooltip"
        text=""
        color="text-orange"
        hover="text-orange"
        elk-group-hover="bg-orange/10"
        icon="i-ri:chat-quote-line"
        active-icon="i-ri:chat-quote-fill"
        :active="!!isBeingQuoted"
        :disabled="!isQuotableStatus"
        :command="command"
        @click="$event => quote()"
      />
    </div>

    <div v-if="!isPartOfDMThread" flex-1>
      <StatusActionButton
        :content="$t('action.boost')"
        :text="!getPreferences(userSettings, 'hideBoostCount') && status.reblogsCount ? status.reblogsCount : ''"
        color="text-green" hover="text-green" elk-group-hover="bg-green/10"
        icon="i-ri:repeat-line"
        active-icon="i-ri:repeat-fill"
        :active="!!status.reblogged"
        :disabled="isLoading.reblogged || !canReblog"
        :loading="animateLoading.reblogsCount"
        :is-increasing="animateIncreasing.reblogsCount"
        :command="command"
        @click="$event => toggleReblog()"
      >
        <template v-if="status.reblogsCount && !getPreferences(userSettings, 'hideBoostCount')" #text>
          <CommonLocalizedNumber
            keypath="action.boost_count"
            :count="status.reblogsCount"
          />
        </template>
      </StatusActionButton>
    </div>

    <div flex-1>
      <StatusActionButton
        :content="$t('action.favourite')"
        :text="!getPreferences(userSettings, 'hideFavoriteCount') && status.favouritesCount ? status.favouritesCount : ''"
        :color="useStarFavoriteIcon ? 'text-yellow' : 'text-rose'"
        :hover="useStarFavoriteIcon ? 'text-yellow' : 'text-rose'"
        :elk-group-hover="useStarFavoriteIcon ? 'bg-yellow/10' : 'bg-rose/10'"
        :icon="useStarFavoriteIcon ? 'i-ri:star-line' : 'i-ri:heart-3-line'"
        :active-icon="useStarFavoriteIcon ? 'i-ri:star-fill' : 'i-ri:heart-3-fill'"
        :active="!!status.favourited"
        :disabled="isLoading.favourited"
        :loading="animateLoading.favouritesCount"
        :is-increasing="animateIncreasing.favouritesCount"
        :command="command"
        @click="$event => toggleFavourite()"
      >
        <template v-if="status.favouritesCount && !getPreferences(userSettings, 'hideFavoriteCount')" #text>
          <CommonLocalizedNumber
            keypath="action.favourite_count"
            :count="status.favouritesCount"
          />
        </template>
      </StatusActionButton>
    </div>

    <div v-if="!isPartOfDMThread" flex-none>
      <StatusActionButton
        :content="$t('action.bookmark')"
        :color="useStarFavoriteIcon ? 'text-rose' : 'text-yellow'"
        :hover="useStarFavoriteIcon ? 'text-rose' : 'text-yellow'"
        :elk-group-hover="useStarFavoriteIcon ? 'bg-rose/10' : 'bg-yellow/10' "
        icon="i-ri:bookmark-line"
        active-icon="i-ri:bookmark-fill"
        :active="!!status.bookmarked"
        :disabled="isLoading.bookmarked"
        :command="command"
        @click="toggleBookmark()"
      />
    </div>

    <div v-if="isPartOfDMThread && isStatusUnread" flex-none>
      <StatusActionButton
        :content="isStatusUnread ? 'Clear notification' : 'Message has been read'"
        :color="useStarFavoriteIcon ? 'text-rose' : 'text-yellow'"
        :hover="useStarFavoriteIcon ? 'text-rose' : 'text-yellow'"
        :elk-group-hover="useStarFavoriteIcon ? 'bg-rose/10' : 'bg-yellow/10' "
        icon="i-ri:mail-check-line"
        active-icon="i-ri:mail-check-fill"
        :active="!isStatusUnread"
        :disabled="!isStatusUnread"
        :command="command"
        @click="markConversationRead(status.id)"
      />
    </div>
  </div>
</template>
