<script setup lang="ts">
const props = withDefaults(defineProps<{
  text?: string
  icon: string
  to: string | Record<string, string>
  userOnly?: boolean
  command?: boolean
  replace?: boolean
}>(), {
  userOnly: false,
  replace: false,
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

let activeClass = $ref('text-primary')
onHydrated(async () => {
  // TODO: force NuxtLink to reevaluate, we now we are in this route though, so we should force it to active
  // we don't have currentServer defined until later
  activeClass = ''
  await nextTick()
  activeClass = 'text-primary'
})

// Optimize rendering for the common case of being logged in, only show visual feedback for disabled user-only items
// when we know there is no user.
const noUserDisable = computed(() => !isHydrated.value || (props.userOnly && !currentUser.value))
const noUserVisual = computed(() => isHydrated.value && props.userOnly && !currentUser.value)
</script>

<template>
  <NuxtLink
    :to="to"
    :disabled="noUserDisable"
    :class="noUserVisual ? 'op25 pointer-events-none ' : ''"
    :active-class="activeClass"
    group focus:outline-none disabled:pointer-events-none
    w-full py-1
    :tabindex="noUserDisable ? -1 : null"
    :replace="props.replace"
    @click="$scrollToTop"
  >
    <CommonTooltip :disabled="!isMediumOrLargeScreen" :content="text" placement="right">
      <div
        flex justify-items-center rounded-full gap4 grid-items-center mxa py1 px5 w-auto
        sm="mxa aspect-ratio-1 w-fit h-fit p2"
        xl="aspect-ratio-0 rounded-full grid-cols-[1fr_auto] gap4 grid-items-center ml0 mr5 py1 px5 w-auto"
        transition-100
        elk-group-hover="bg-active" group-focus-visible:ring="2 current"
      >
        <slot name="icon">
          <div min-w-5 :class="icon" text-2xl />
        </slot>
        <slot>
          <span w-full block sm:hidden xl:block select-none>{{ isHydrated ? text : '&nbsp;' }}</span>
        </slot>
      </div>
    </CommonTooltip>
  </NuxtLink>
</template>
