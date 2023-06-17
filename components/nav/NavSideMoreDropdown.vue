<script setup lang="ts">
const { command } = defineProps<{
  text?: string
  command?: boolean
}>()

const mask = useMask()

let activeClass = $ref('text-primary')
onHydrated(async () => {
  // TODO: force NuxtLink to reevaluate, we now we are in this route though, so we should force it to active
  // we don't have currentServer defined until later
  activeClass = ''
  await nextTick()
  activeClass = 'text-primary'
})
</script>

<template>
  <VDropdown :distance="0" placement="top-start" strategy="fixed" @apply-show="mask.show()" @apply-hide="mask.hide()">
    <!-- 21:5  error  Expected '<component>' elements to have 'v-bind:is' attribute  vue/require-component-is -->
    <div
      :active-class="activeClass"
      group focus:outline-none disabled:pointer-events-none
      :aria-label="$t('action.more')"
      w-full
      py-1
    >
      <CommonTooltip :disabled="!isMediumOrLargeScreen" :content="text" placement="right">
        <div
          flex justify-items-center
          w-fit h-fit aspect-ratio-1 rounded-full p2
          sm="mxa"
          xl="aspect-ratio-0 rounded-full grid-cols-[1fr_auto] gap4 grid-items-center ml0 mr5 py1 px4 w-auto"
          transition-100
          elk-group-hover="bg-active" group-focus-visible:ring="2 current"
        >
          <div min-w-5 class="i-heroicons-ellipsis-horizontal-circle" text-2xl />
          <span block sm:hidden xl:block select-none>{{ isHydrated ? text : '&nbsp;' }}</span>
        </div>
      </CommonTooltip>
    </div>
    <template #popper="{ hide }">
      <NavSideMoreMenu :command="command" @click="hide" />
    </template>
  </VDropdown>
</template>
