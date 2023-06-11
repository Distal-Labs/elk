<script setup lang="ts">
import { ROUTES_THAT_SWITCH_USER_CONTEXT } from '~/constants'

withDefaults(defineProps<{
  /** Show the back button on small screens */
  backOnSmallScreen?: boolean
  /** Show the back button on both small and big screens */
  back?: boolean
  /** Do not applying overflow hidden to let use floatable components in title */
  noOverflowHidden?: boolean
}>(), {
  backOnSmallScreen: true,
  back: false,
})

const container = ref()
const route = useRoute()
const { height: windowHeight } = useWindowSize()
const { height: containerHeight } = useElementBounding(container)
const wideLayout = computed(() => route.meta.wideLayout ?? false)
const sticky = computed(() => route.path?.startsWith('/settings/'))
const containerClass = computed(() => {
  // we keep original behavior when not in settings page and when the window height is smaller than the container height
  if (!isHydrated.value || !sticky.value || (windowHeight.value < containerHeight.value))
    return null

  return 'lg:sticky lg:top-0'
})
const router = useRouter()
async function handleBackClick() {
  if ((router.options.history.state.back === 'home'))
    await router.push('/home')
  else if ((router.options.history.state.back === 'index') || (router.options.history.state.back === null))
    await router.replace('/')
  else if ((currentUser.value !== undefined) && (ROUTES_THAT_SWITCH_USER_CONTEXT.includes(router.currentRoute.value.name as string)))
    await router.push(router.options.history.state.back as string)
  else
    router.go(-1)
}
</script>

<template>
  <div ref="container" :class="containerClass">
    <div
      sticky top-0 z10 backdrop-blur
      pt="[env(safe-area-inset-top,0)]"
      bg="[rgba(var(--rgb-bg-base),0.7)]"
      class="native:lg:w-[calc(100vw-5rem)] native:xl:w-[calc(135%+(100vw-1200px)/2)]"
    >
      <div flex justify-between px5 py2 :class="{ 'xl:hidden': $route.name !== 'tag' }" class="native:lg:flex" border="b base">
        <div flex gap-3 items-center :overflow-hidden="!noOverflowHidden ? '' : false" py2 w-full>
          <NuxtLink
            v-if="(backOnSmallScreen || back) && ($router.options.history.state!.position as number > 2) && (!['home', ...ROUTES_THAT_SWITCH_USER_CONTEXT].includes($router.currentRoute?.value?.name?.toString() ?? ''))" flex="~ gap1" items-center btn-text p-0 xl:hidden
            :aria-label="$t('nav.back')"
            @click="handleBackClick"
          >
            <div i-ri:arrow-left-line class="rtl-flip" />
          </NuxtLink>
          <div :truncate="!noOverflowHidden ? '' : false" flex w-full data-tauri-drag-region class="native-mac:justify-center native-mac:text-center native-mac:sm:justify-start">
            <slot name="title" />
          </div>
          <div sm:hidden h-7 w-1px />
        </div>
        <div flex items-center flex-shrink-0 gap-x-2>
          <slot name="actions" />
          <PwaBadge xl:hidden />
          <NavUser v-if="isHydrated" />
          <NavUserSkeleton v-else />
        </div>
      </div>
      <slot name="header">
        <div hidden />
      </slot>
    </div>
    <PwaInstallPrompt xl:hidden />
    <div :class="isHydrated && wideLayout ? 'xl:w-full sm:max-w-600px' : 'sm:max-w-600px md:shrink-0'" m-auto>
      <div hidden :class="{ 'xl:block': $route.name !== 'tag' && !$slots.header }" h-6 />
      <slot />
    </div>
  </div>
</template>
