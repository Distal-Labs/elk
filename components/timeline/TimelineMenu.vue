<script setup lang="ts">
const { routeName } = defineProps<{
  routeName: string
}>()

const mask = useMask()

const { countActiveNotifications, dismissAllNotifications } = useNotifications(routeName)

function clearAllNotifications() {
  if (process.dev)
    console.warn('Clearing all notifications!', routeName)
  dismissAllNotifications()
}

const countNotifications = $computed(() => {
  return countActiveNotifications() ?? 0
})
</script>

<template>
  <div v-if="isHydrated" block py0 m0 px2 w-full h-full>
    <div flex="~" items-center justify-between>
      <VDropdown :distance="0" placement="top-start" strategy="fixed" @apply-show="mask.show()" @apply-hide="mask.hide()">
        <TimelineMenuButton
          :content="routeName !== 'notifications' ? '' : $t('action.more')"
          color="'text-primary'"
          hover="'text-primary'"
          elk-group-hover="bg-primary-light"
          icon="i-ri:more-2-line"
          active-icon="i-ri:more-line"
          :disabled="routeName !== 'notifications'"
        />
        <template #popper="{ hide }">
          <div sm:min-w-80 max-w-100vw mxa py2 flex="~ col" @click="hide()">
            <span flex="~ col" w-full pt3 pb3 px4 text-current font-800 text-size-xl>Notifications</span>
            <div border="t base" pt2 bg-card class="spacer" shrink />

            <button
              flex rounded px4 py3 text-left
              hover:bg-active cursor-pointer transition-100
              aria-label="'Clear all notifications'"
              :disabled="!(countNotifications > 0)"
              @click="clearAllNotifications"
            >
              <div flex flex-row items-center gap2 relative>
                <div w-10 h-10 flex-none rounded-full bg-active flex place-items-center place-content-center>
                  <div i-ri:checkbox-circle-line text-secondary text-lg />
                </div>
                <div flex flex-col>
                  <span v-if="countNotifications > 0" font-bold>Clear all {{ countNotifications }} notifications</span>
                  <span v-else font-bold>You're all caught up!</span>
                </div>
              </div>
              <div flex-auto />
              <!-- <div v-if="drawerContext === 'posts'" i-ri:check-line text-primary mya ms-2 text-2xl /> -->
            </button>
          </div>
        </template>
      </VDropdown>
    </div>
  </div>
</template>
