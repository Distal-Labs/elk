<script setup lang="ts">
import { ROUTES_THAT_SWITCH_USER_CONTEXT } from '~/constants'

const router = useRouter()
const backRef = ref<string>('')
// only one icon can be lit up at the same time
const moreMenuVisible = ref(false)

onMounted(() => {
  backRef.value = ''
})
const { countNotifications } = useNotifications()
const { countUnreadConversations } = useConversations()
router.afterEach(async (to, from) => {
  if (ROUTES_THAT_SWITCH_USER_CONTEXT.includes(to.name as string) && (to.name !== from.name))
    backRef.value = ''
  else if ((currentUser.value !== undefined) && ((router.currentRoute.value.name === 'home') || (router.currentRoute.value.name === 'index') || (router.currentRoute.value.name === null)))
    backRef.value = ''
  else
    backRef.value = router.currentRoute.value.path
})
</script>

<template>
  <nav
    h-14 border="t base" flex flex-row text-xl
    of-y-scroll scrollbar-hide overscroll-none
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
          <div v-if="countNotifications > 0" class="top-[-0.3rem] right-[-0.3rem]" absolute font-bold rounded-full h-4 w-4 text-xs bg-primary text-inverted flex items-center justify-center>
            {{ countNotifications < 10 ? countNotifications : '•' }}
          </div>
        </div>
      </NuxtLink>
      <NuxtLink to="/conversations" :aria-label="$t('nav.conversations')" :active-class="moreMenuVisible ? '' : 'text-primary'" flex flex-row items-center place-content-center h-full flex-1 class="coarse-pointer:select-none" :replace="true" @click="$scrollToTop">
        <div flex relative>
          <div class="i-ri:mail-line" text-xl />
          <div v-if="countUnreadConversations" class="top-[-0.3rem] right-[-0.3rem]" absolute font-bold rounded-full h-4 w-4 text-xs bg-primary text-inverted flex items-center justify-center>
            {{ countUnreadConversations < 10 ? countUnreadConversations : '•' }}
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
