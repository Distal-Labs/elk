<script setup lang="ts">
import { computedEager } from '@vueuse/core'
import { ROUTES_THAT_SWITCH_USER_CONTEXT } from '~/constants'

const router = useRouter()
const backRef = ref<string>('')
// only one icon can be lit up at the same time
const moreMenuVisible = ref(false)

onMounted(() => {
  backRef.value = ''
})
const { countActiveNotifications } = useNotifications(router.currentRoute.value.name?.toString() ?? 'home')
const { countUnreadConversations } = useConversations(router.currentRoute.value.name?.toString() ?? 'home')
const { width: windowWidth } = useWindowSize()

router.afterEach(async (to, from) => {
  if (windowWidth.value < 640)
    return
  if (ROUTES_THAT_SWITCH_USER_CONTEXT.includes(to.name as string) && (to.name !== from.name))
    backRef.value = ''
  else if ((currentUser.value !== undefined) && ((router.currentRoute.value.name === 'home') || (router.currentRoute.value.name === 'index') || (router.currentRoute.value.name === null)))
    backRef.value = ''
  else
    backRef.value = router.currentRoute.value.path
})

const countNotifications = computedEager(() => {
  if (windowWidth.value < 640)
    return countActiveNotifications()
  return 0
})

const countConversations = computedEager(() => {
  if (windowWidth.value < 640)
    return countUnreadConversations.value
  return 0
})
</script>

<template>
  <nav
    h-14 border="t base" flex flex-row text-xl
    sticky bottom-0 left-0 right-0 overscroll-none sm="hidden"
    class="after-content-empty after:(h-[calc(100%+0.5px)] w-0.1px pointer-events-none)"
  >
    <!-- These weird styles above are used for scroll locking, don't change it unless you know exactly what you're doing. -->
    <template v-if="currentUser">
      <NuxtLink to="/home" :aria-label="$t('nav.home')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div i-ri:home-5-line />
      </NuxtLink>
      <NuxtLink :to="`/${currentServer}/explore`" :aria-label="$t('nav.explore')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div i-ri:hashtag />
      </NuxtLink>
      <NuxtLink to="/search" :aria-label="$t('nav.search')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div i-ri:search-line />
      </NuxtLink>
      <NuxtLink to="/notifications" :aria-label="$t('nav.notifications')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div flex relative>
          <div class="i-ri:notification-4-line" text-xl />
          <div v-if="countNotifications > 0" class="top-[-0.4rem] right-[-0.4rem] h-1.25rem w-1.25rem" absolute font-bold rounded-full text-xs bg-primary text-inverted flex items-center justify-center>
            {{ countNotifications < 100 ? countNotifications : '•' }}
          </div>
        </div>
      </NuxtLink>
      <NuxtLink to="/conversations" :aria-label="$t('nav.conversations')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div flex relative>
          <div class="i-ri:mail-line" text-xl />
          <div v-if="countConversations > 0" class="top-[-0.4rem] right-[-0.4rem] h-1.25rem w-1.25rem" absolute font-bold rounded-full text-xs bg-primary text-inverted flex items-center justify-center>
            {{ countConversations < 100 ? countConversations : '•' }}
          </div>
        </div>
      </NuxtLink>
    </template>
    <template v-else>
      <NuxtLink :to="`/${currentServer}/explore`" :aria-label="$t('nav.explore')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div i-ri:hashtag />
      </NuxtLink>
      <NuxtLink group :to="`/${currentServer}/public/local`" :aria-label="$t('nav.local')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div i-ri:group-2-line />
      </NuxtLink>
      <NuxtLink :to="`/${currentServer}/public`" :aria-label="$t('nav.federated')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div i-ri:earth-line />
      </NuxtLink>
    </template>
    <NavBottomMoreMenu v-slot="{ toggleVisible, show }" v-model="moreMenuVisible" flex flex-row items-center place-content-center h-full flex-1 cursor-pointer>
      <label
        flex items-center place-content-center h-full flex-1 class="select-none"
        :class="show ? '!text-primary' : ''"
      >
        <input type="checkbox" z="-1" absolute inset-0 opacity-0 @click="toggleVisible">
        <span v-show="show" i-ri:close-fill />
        <span v-show="!show" i-ri:more-fill />
      </label>
    </NavBottomMoreMenu>
  </nav>
</template>
