<script setup lang="ts">
import { inject, ref } from 'vue'
import type { mastodon } from 'masto'
import { domToCanvas } from '../../composables/quote'

const props = defineProps<{
  status: mastodon.v1.Status
  details?: boolean
  command?: boolean
  quotableElement?: HTMLElement
}>()

const focusEditor = inject<typeof noop>('focus-editor', noop)
const attachQuote = inject<typeof noop>('attach-quote', noop)
const detachQuote = inject<typeof noop>('detach-quote', noop)

const { details, command, quotableElement } = $(props)

const userSettings = useUserSettings()
const useStarFavoriteIcon = usePreferences('useStarFavoriteIcon')

const {
  status,
  isLoading,
  canReblog,
  toggleBookmark,
  toggleFavourite,
  toggleReblog,
} = $(useStatusActions(props))

function shouldNodeBeIncluded<T extends Node>(el: T): boolean
function shouldNodeBeIncluded(el: Element): boolean {
  if (['IFRAME'].includes(el.tagName)) {
    // console.debug(el.tagName)
    return false
  }

  if ((el) && (['#text', '#comment', 'IFRAME'].includes(el.nodeName) === false)) {
    // el.removeAttribute('data-v-inspector')
    // el.removeAttribute('class')
    // console.log(el)
    return (el.getAttribute('src')?.includes('data:image/svg+xml') !== true)
  }

  return true
}

async function whatToDoWithBlob(blob: Blob | null) {
  if (blob)
    await attachQuote(blob)

  else console.error('NO BLOB!')
}

const canQuote = $computed(() =>
  (
    (status.visibility === 'public')
    || ((status.visibility !== 'private') && (
      (status.account.id === currentUser.value?.account.id)
      && ((status.inReplyToAccountId === null) || (status.inReplyToAccountId === currentUser.value?.account.id))
    )
    )
  )
    && (
      ((status.account.discoverable === true) || (status.account.discoverable === null))
    && ((status.account.locked === false) || (status.account.locked === null))
    && (status.account.note.toLowerCase().search(/(#?no ?qts?)|(#?no ?quotes?)|(#?no ?quoting?)/gi) === -1)
    ),
)

const cannotQuoteReason = $computed((): string => {
  if (!canQuote) {
    if (status.visibility === 'private')
      return 'Unable to quote a private message'
    else if (status.visibility !== 'public')
      return 'Quoting disabled because the post is not public'
    else if ((status.account.discoverable !== true) && (status.account.discoverable !== null))
      return 'Quoting disabled because the author is not \'discoverable\''
    else if ((status.account.locked !== false) && (status.account.locked !== null))
      return 'Quoting disabled because the author\'s account is private'
    else if ((status.account.note.toLowerCase().search(/(#?no ?qts?)|(#?no ?quotes?)|(#?no ?quoting?)/gi) !== -1))
      return 'Quoting disabled because the author has opted out of quoting'
    else
      return 'Quoting disabled because the post is ineligible for quoting'
  }
  else {
    return 'Insert Quote'
  }
})

const hasQuoted = ref<boolean>(false)
async function quote() {
  focusEditor()
  if (!hasQuoted.value) {
    if (quotableElement) {
      const colorMode = useColorMode()
      const quoteBackgroundColor = (colorMode.value === 'dark') ? '#1a202c' : '#fafafa'
      const canvasWithQuote = await domToCanvas(quotableElement, {
        filter: shouldNodeBeIncluded,
        backgroundColor: quoteBackgroundColor,
        scale: 1.0,
        font: {
          preferredFormat: 'woff',
        },
      })
      canvasWithQuote.toBlob(whatToDoWithBlob)
      hasQuoted.value = !hasQuoted.value
    }
  }
  else {
    detachQuote()
    hasQuoted.value = !hasQuoted.value
  }
}

function reply() {
  if (!checkLogin())
    return
  if (details)
    focusEditor()
  else
    navigateToStatus({ status, focusReply: true })
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

    <div v-if="details" flex-1>
      <StatusActionButton
        :content="cannotQuoteReason"
        text=""
        color="text-orange"
        hover="text-orange"
        elk-group-hover="bg-orange/10"
        icon="i-ri:chat-quote-line"
        active-icon="i-ri:chat-quote-fill"
        :active="!!hasQuoted"
        :disabled="isLoading.quotable || !canQuote"
        :command="command"
        @click="quote"
      />
    </div>

    <div flex-1>
      <StatusActionButton
        :content="$t('action.boost')"
        :text="!getPreferences(userSettings, 'hideBoostCount') && status.reblogsCount ? status.reblogsCount : ''"
        color="text-green" hover="text-green" elk-group-hover="bg-green/10"
        icon="i-ri:repeat-line"
        active-icon="i-ri:repeat-fill"
        :active="!!status.reblogged"
        :disabled="isLoading.reblogged || !canReblog"
        :command="command"
        @click="toggleReblog()"
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
        :command="command"
        @click="toggleFavourite()"
      >
        <template v-if="status.favouritesCount && !getPreferences(userSettings, 'hideFavoriteCount')" #text>
          <CommonLocalizedNumber
            keypath="action.favourite_count"
            :count="status.favouritesCount"
          />
        </template>
      </StatusActionButton>
    </div>

    <div flex-none>
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
  </div>
</template>
