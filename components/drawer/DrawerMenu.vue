<script setup lang="ts">
import type { mastodon } from 'masto'
import type { DrawerContextOptionsType, DrawerContextType } from '~/types'

const { isUpdateInProgress, changeContext, tags, selectedTagName } = withDefaults(defineProps<{
  isUpdateInProgress?: boolean
  drawerContext: DrawerContextType
  changeContext: (context: DrawerContextType, options?: DrawerContextOptionsType) => void
  tags?: mastodon.v1.Tag[]
  selectedTagName?: string | null
}>(), {
  isUpdateInProgress: false,
})

const mask = useMask()
</script>

<template>
  <div hidden lg="block" pt-4 px-2 w-full>
    <div flex="~" items-center justify-between>
      <VDropdown :distance="0" placement="top-start" strategy="fixed" @apply-show="mask.show()" @apply-hide="mask.hide()">
        <DrawerMenuButton
          :content="isUpdateInProgress ? 'Getting latest info...' : $t('action.more')"
          color="'text-primary'"
          hover="'text-primary'"
          elk-group-hover="bg-primary-light"
          icon="i-ri:more-2-line"
          active-icon="i-ri:refresh-line"
          :active="isUpdateInProgress"
          :disabled="isUpdateInProgress"
          :class="[isUpdateInProgress ? 'animate-spin preserve-3d' : '']"
        />
        <template #popper="{ hide }">
          <DrawerContextSwitcher v-bind="{ drawerContext, changeContext, tags, selectedTagName }" @click="hide" />
        </template>
      </VDropdown>
    </div>
  </div>
</template>
