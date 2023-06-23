<script setup lang="ts">
import type { mastodon } from 'masto'
import { inject, ref } from 'vue'
import { useElementVisibility } from '@vueuse/core'
import { explainIsQuotable, isQuotable } from '../../composables/quote'

const props = withDefaults(
  defineProps<{
    status: mastodon.v1.Status
    actions?: boolean
    context?: mastodon.v2.FilterContext
    hover?: boolean
    inNotification?: boolean
    isPreview?: boolean

    // If we know the prev and next status in the timeline, we can simplify the card
    older?: mastodon.v1.Status
    newer?: mastodon.v1.Status
    // Manual overrides
    hasOlder?: boolean
    hasNewer?: boolean

    // When looking into a detailed view of a post, we can simplify the replying badges
    // to the main expanded post
    main?: mastodon.v1.Status
    // Fedified Extensions
    isBeingQuoted?: boolean
    toggleQuote?: <T extends Node>(quotableElement: T) => Promise<void>
    isTrendingPost?: boolean
    isLastStatusInConversation?: boolean
  }>(),
  {
    actions: true,
  })

const userSettings = useUserSettings()

const _status = computed(() => {
  if (props.status.reblog && (!props.status.content || props.status.content === props.status.reblog.content))
    return props.status.reblog
  return props.status
})

const status = ref<mastodon.v1.Status>(_status.value)
const isQuotableStatus = $computed(() => isQuotable(status.value))
const explainIsQuotableStatus = $computed(() => explainIsQuotable(status.value))

// Use original status, avoid connecting a reblog
const directReply = $computed(() => props.hasNewer || (!!status.value.inReplyToId && (status.value.inReplyToId === props.newer?.id || status.value.inReplyToId === props.newer?.reblog?.id)))
// Use reblogged status, connect it to further replies
const connectReply = $computed(() => props.hasOlder || status.value.id === props.older?.inReplyToId || status.value.id === props.older?.reblog?.inReplyToId)
// Open a detailed status, the replies directly to it
const replyToMain = $computed(() => props.main && props.main.id === status.value.inReplyToId)

const rebloggedBy = $computed(() => props.status.reblog ? props.status.account : null)

const statusRoute = $computed(() => getStatusRoute(status.value))

const router = useRouter()

function go(evt: MouseEvent | KeyboardEvent) {
  if (evt.metaKey || evt.ctrlKey)
    window.open(statusRoute.href)

  else
    router.push(statusRoute)
}

const createdAt = useFormattedDateTime(status.value.createdAt)
const timeAgoOptions = useTimeAgoOptions(true)
const timeago = useTimeAgo(() => status.value.createdAt, timeAgoOptions)

const isSelfReply = $computed(() => status.value.inReplyToAccountId === status.value.account.id)
const collapseRebloggedBy = $computed(() => rebloggedBy?.id === status.value.account.id)
const isDM = $computed(() => props.isLastStatusInConversation || status.value.visibility === 'direct')

const showUpperBorder = $computed(() => props.newer && !directReply)
const showReplyTo = $computed(() => !replyToMain && !directReply)

const forceShow = ref(false)

const focusEditor = inject<typeof noop>('focus-editor', noop)
const quotableElement = ref<Node>()
async function toggleQuote() {
  if (props.toggleQuote && quotableElement.value) {
    focusEditor()
    props.toggleQuote(quotableElement.value)
  }
}

onBeforeMount(async () => {
  if (props.context === 'home' || props.context === 'notifications') {
    // Silently update data after status is off-screen
    // await fetchStatus(_status.value.uri, true).then((r) => {
    await fetchStatus(status.value.uri, true).then((r) => {
      status.value = r ?? _status.value
    })
  }
})

const target = ref(null)
const targetIsVisible = useElementVisibility(target)
watch(
  [targetIsVisible],
  async () => {
    if (!targetIsVisible.value && !props.inNotification && !props.isBeingQuoted) {
      if (status.value instanceof Promise)
        return

      cacheStatus(status.value, true).then((aPost) => {
        if (aPost && !(aPost instanceof Promise)) {
          if (process.dev)
            console.warn('Re-fetched', aPost.account.acct, aPost.id, aPost.repliesCount, aPost.reblogsCount, aPost.favouritesCount)
          status.value = aPost
        }
      }).catch((e) => {
        if (process.dev)
          console.error((e as Error).message)
      })
    }
  },
)
</script>

<template>
  <StatusLink ref="target" :status="status" :hover="hover && currentUser !== undefined">
    <!-- Upper border -->
    <div :h="showUpperBorder ? '1px' : '0'" w-auto bg-border mb-1 />

    <slot name="meta">
      <!-- Line connecting to previous status -->
      <template v-if="status.inReplyToAccountId">
        <StatusReplyingTo
          v-if="showReplyTo"
          m="is-5" p="t-1 is-5"
          :status="status"
          :is-self-reply="isSelfReply"
          :class="inNotification ? 'text-secondary-light' : ''"
        />
        <div flex="~ col gap-1" items-center pos="absolute top-0 inset-is-0" w="77px" z--1>
          <template v-if="showReplyTo">
            <div w="1px" h="0.5" border="x base" mt-3 />
            <div w="1px" h="0.5" border="x base" />
            <div w="1px" h="0.5" border="x base" />
          </template>
          <div w="1px" h-10 border="x base" />
        </div>
      </template>

      <!-- Reblog status -->
      <div flex="~ col" justify-between>
        <div
          v-if="rebloggedBy && !collapseRebloggedBy"
          flex="~" items-center
          p="t-1 b-0.5 x-1px"
          relative text-secondary ws-nowrap
        >
          <div i-ri:repeat-fill me-46px text-green w-16px h-16px class="status-boosted" />
          <div absolute top-1 ms-24px w-32px h-32px rounded-full>
            <template v-if="currentUser">
              <AccountHoverWrapper :account="rebloggedBy">
                <NuxtLink :to="getAccountRoute(rebloggedBy)">
                  <AccountAvatar :account="rebloggedBy" />
                </NuxtLink>
              </AccountHoverWrapper>
            </template>
            <template v-else>
              <AccountHoverWrapper :account="rebloggedBy" disabled>
                <NuxtLink :to="undefined" @click.prevent="checkLogin()">
                  <AccountAvatar :account="rebloggedBy" />
                </NuxtLink>
              </AccountHoverWrapper>
            </template>
          </div>
          <AccountInlineInfo font-bold :account="rebloggedBy" :avatar="false" text-sm />
        </div>
      </div>
    </slot>

    <div flex gap-3 :class="{ 'text-secondary': inNotification }">
      <template v-if="status.account.suspended && !forceShow">
        <div flex="~col 1" min-w-0>
          <p italic>
            {{ $t('status.account.suspended_message') }}
          </p>
          <div>
            <button p-0 flex="~ center" gap-2 text-sm btn-text @click="forceShow = true">
              <div i-ri:eye-line />
              <span>{{ $t('status.account.suspended_show') }}</span>
            </button>
          </div>
        </div>
      </template>
      <template v-else>
        <!-- Avatar -->
        <div relative>
          <div v-if="collapseRebloggedBy" absolute flex items-center justify-center top--6px px-2px py-3px rounded-full bg-base>
            <div i-ri:repeat-fill text-green w-16px h-16px />
          </div>
          <template v-if="currentUser">
            <AccountHoverWrapper :account="status.account">
              <NuxtLink :to="getAccountRoute(status.account)" rounded-full>
                <AccountBigAvatar :account="status.account" />
              </NuxtLink>
            </AccountHoverWrapper>
          </template>
          <template v-else>
            <AccountHoverWrapper :account="status.account" disabled>
              <NuxtLink :to="undefined" rounded-full @click.prevent="checkLogin()">
                <AccountBigAvatar :account="status.account" />
              </NuxtLink>
            </AccountHoverWrapper>
          </template>
          <div v-if="connectReply" w-full h-full flex mt--3px justify-center>
            <div v-if="isDM" w-1px border="x primary" mb-9 />
            <div v-else w-1px border="x base" mb-9 />
          </div>
        </div>

        <!-- Main -->
        <div flex="~ col 1" min-w-0>
          <div ref="quotableElement" style="padding: 2rem;">
            <!-- Account Info -->
            <div flex items-center space-x-1>
              <AccountHoverWrapper :account="status.account" :disabled="!currentUser">
                <StatusAccountDetails :account="status.account" />
              </AccountHoverWrapper>
              <div flex-auto />
              <div v-show="!getPreferences(userSettings, 'zenMode')" text-sm text-secondary flex="~ row nowrap" hover:underline whitespace-nowrap>
                <AccountBotIndicator v-if="status.account.bot" me-2 />
                <div flex="~ gap1" items-center>
                  <StatusVisibilityIndicator v-if="status.visibility !== 'public'" :status="status" />
                  <div flex>
                    <CommonTooltip :content="createdAt">
                      <template v-if="currentUser">
                        <NuxtLink :title="status.createdAt" :href="statusRoute.href" @click.prevent="go($event)">
                          <time text-sm ws-nowrap hover:underline :datetime="status.createdAt">
                            {{ timeago }}
                          </time>
                        </NuxtLink>
                      </template>
                      <template v-else>
                        <NuxtLink :to="undefined" :title="status.createdAt" @click.prevent="checkLogin()">
                          <time text-sm ws-nowrap hover:underline :datetime="status.createdAt">
                            {{ timeago }}
                          </time>
                        </NuxtLink>
                      </template>
                    </CommonTooltip>
                    <StatusEditIndicator :status="status" inline />
                  </div>
                </div>
              </div>
              <StatusActionsMore v-if="actions !== false" :status="status" me--2 />
            </div>

            <!-- Content -->
            <StatusContent
              :status="status"
              :newer="newer"
              :context="context"
              :is-preview="props.isPreview"
              :in-notification="props.inNotification"
              mb2 :class="{ 'mt-2 mb1': isDM }"
            />
          </div>
          <StatusActions
            v-if="actions !== false && !props.isBeingQuoted"
            v-show="!getPreferences(userSettings, 'zenMode')"
            :status="status"
            :is-quotable-status="isQuotableStatus"
            :explain-is-quotable-status="explainIsQuotableStatus"
            :is-being-quoted="props.isBeingQuoted"
            :toggle-quote="toggleQuote"
            :is-d-m="isDM"
            :is-last-status-in-conversation="props.isLastStatusInConversation"
          />
        </div>
      </template>
    </div>
  </StatusLink>
</template>
