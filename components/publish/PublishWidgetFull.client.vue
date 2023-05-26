<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'

const route = useRoute()
const { formatNumber } = useHumanReadableNumber()
const timeAgoOptions = useTimeAgoOptions()

let draftKey = $ref('home')

const draftKeys = $computed(() => Object.keys(currentUserDrafts.value))
const nonEmptyDrafts = $computed(() => draftKeys
  .filter(i => i !== draftKey && !isEmptyDraft(currentUserDrafts.value[i]))
  .map(i => [i, currentUserDrafts.value[i]] as const),
)

watchEffect(() => {
  draftKey = route.query.draft?.toString() || 'home'
})

onDeactivated(() => {
  clearEmptyDrafts()
})
</script>

<template>
  <div class="sticky top-0 pt-0">
    <div
      sticky top-0 z10 backdrop-blur
      pt="[env(safe-area-inset-top,0)]"
      bg="[rgba(var(--rgb-bg-base),0.7)]"
      class="native:lg:w-[calc(100vw-5rem)] native:xl:w-[calc(135%+(100vw-1200px)/2)]"
    >
      <div flex justify-between px5 py2 :class="{ 'xl:hidden': $route.name !== 'tag' }" class="native:lg:flex" border="b base">
        <div flex gap-3 items-center :overflow-hidden="false" py2 w-full>
          <NuxtLink
            flex="~ gap1" items-center btn-text p-0 xl:hidden
            :aria-label="$t('nav.back')"
            @click="$router.go(-1)"
          >
            <div i-ri:arrow-left-line class="rtl-flip" />
          </NuxtLink>
          <div :truncate="false" flex w-full data-tauri-drag-region class="native-mac:justify-center native-mac:text-center native-mac:sm:justify-start">
            <slot name="title" />
          </div>
          <div sm:hidden h-7 w-1px />
        </div>
        <VDropdown v-if="nonEmptyDrafts.length" placement="bottom-end">
          <button btn-text flex="inline center">
            {{ $t('compose.drafts', nonEmptyDrafts.length, { named: { v: formatNumber(nonEmptyDrafts.length) } }) }}&#160;<div aria-hidden="true" i-ri:arrow-down-s-line />
          </button>
          <template #popper="{ hide }">
            <div flex="~ col">
              <NuxtLink
                v-for="[key, draft] of nonEmptyDrafts" :key="key"
                border="b base" text-left py2 px4 hover:bg-active
                :replace="true"
                :to="`/compose?draft=${encodeURIComponent(key)}`"
                @click="hide()"
              >
                <div>
                  <div flex="~ gap-1" items-center>
                    <i18n-t keypath="compose.draft_title">
                      <code>{{ key }}</code>
                    </i18n-t>
                    <span v-if="draft.lastUpdated" text-secondary text-sm>
                      &middot; {{ formatTimeAgo(new Date(draft.lastUpdated), timeAgoOptions) }}
                    </span>
                  </div>
                  <div text-secondary>
                    {{ htmlToText(draft.params.status).slice(0, 50) }}
                  </div>
                </div>
              </NuxtLink>
            </div>
          </template>
        </VDropdown>
      </div>
    </div>
    <div>
      <PublishWidget :key="draftKey" expanded class="min-h-100!" :draft-key="draftKey" />
    </div>
  </div>
</template>
