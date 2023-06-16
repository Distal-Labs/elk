<script setup lang="ts">
const props = withDefaults(defineProps<{
  text?: string
  icon: string
  to: string | Record<string, string>
  userOnly?: boolean
  command?: boolean
  replace?: boolean
  disable?: boolean
}>(), {
  userOnly: false,
  replace: false,
  disable: false,
})

defineSlots<{
  icon: (props: {}) => void
  default: (props: {}) => void
}>()

const router = useRouter()

useCommand({
  scope: 'Navigation',

  name: () => props.text ?? (typeof props.to === 'string' ? props.to as string : props.to.name),
  icon: () => props.icon,
  visible: () => props.command,

  onActivate() {
    router.push(props.to)
  },
})

let activeClass = $ref('bg-primary text-base bg-transparent')
onHydrated(async () => {
  // TODO: force NuxtLink to reevaluate, we now we are in this route though, so we should force it to active
  // we don't have currentServer defined until later
  activeClass = ''
  await nextTick()
  activeClass = 'bg-primary text-base bg-transparent'
})

// Optimize rendering for the common case of being logged in, only show visual feedback for disabled user-only items
// when we know there is no user.
const noUserDisable = computed(() => !isHydrated.value || props.disable || (props.userOnly && !currentUser.value))
const noUserVisual = computed(() => (isHydrated.value && props.userOnly && !currentUser.value) || props.disable)
</script>

<template>
  <NuxtLink
    :to="to"
    :disabled="noUserDisable"
    :class="noUserVisual ? 'op25 pointer-events-none ' : ''"
    :active-class="activeClass"
    group focus:outline-none disabled:pointer-events-none
    :tabindex="noUserDisable ? -1 : null"
    :replace="props.replace"
    @click="$scrollToTop"
  >
    <CommonTooltip :disabled="!isMediumOrLargeScreen" :content="text" placement="right">
      <div
        class="item"
        flex justify-center gap4
        w-fit h-fit aspect-ratio-1
        py-0 px2 mx0 sm:mxa
        bg-primary text-base rounded-full shadow="~ md text-secondary" w-48px h-48px
        xl="items-center justify-start ml0 mr5 px5 w-auto aspect-ratio-0"
        transition-100
        elk-group-hover="bg-active text-base" group-focus-visible:ring="2 current"
      >
        <slot name="icon">
          <div :class="icon" text-xl />
        </slot>
        <slot>
          <span block sm:hidden xl:block select-none>{{ isHydrated ? text : '&nbsp;' }}</span>
        </slot>
      </div>
    </CommonTooltip>
  </NuxtLink>
</template>

<style scoped>
  .item {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  @media screen and ( max-height: 820px ) and ( min-width: 1280px ) {
    .item {
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
    }
  }
  @media screen and ( max-height: 780px ) and ( min-width: 640px ) {
    .item {
      padding-top: 0.35rem;
      padding-bottom: 0.35rem;
    }
  }
  @media screen and ( max-height: 780px ) and ( min-width: 1280px ) {
    .item {
      padding-top: 0.05rem;
      padding-bottom: 0.05rem;
    }
  }
</style>
