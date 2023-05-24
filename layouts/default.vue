<script lang="ts" setup>
import { usePreferences } from '~/composables/settings'

const route = useRoute()

const wideLayout = computed(() => route.meta.wideLayout ?? false)

const showUserPicker = logicAnd(
  usePreferences('experimentalUserPicker'),
  () => useUsers().value.length > 1,
)

const isGrayscale = usePreferences('grayscaleMode')
</script>

<template>
  <div h-full class="sm:(ml-0 pl-0)" :data-mode="isHydrated && isGrayscale ? 'grayscale' : ''" data-tauri-drag-region>
    <main content-between flex w-full lg="max-w-100dvw justify-between" xl="justify-between" class="native:grid native:sm:grid-cols-[auto_1fr] native:lg:grid-cols-[auto_minmax(600px,2fr)_1fr]">
      <aside native="me-0 w-auto" sm="flex mx-0 px-0" md="max-w-1/6 me-4" xl="w-1/5" class="zen-hide" hidden justify-start relative>
        <div sticky top-0 class="w-fit max-w-20dvw" h-100dvh flex="~ col" lt-lg-items-center>
          <slot name="left">
            <div flex="~ col" overflow-y-auto justify-between h-full max-w-full overflow-x-hidden>
              <NavTitle />
              <NavSide command />
              <div flex-auto />
              <div v-if="isHydrated" flex flex-col sticky bottom-0 bg-base>
                <div hidden xl:block>
                  <UserSignInEntry v-if="!currentUser" />
                </div>
                <div v-if="currentUser" p6 pb8 w-full>
                  <div hidden xl-block>
                    <UserPicker v-if="showUserPicker" />
                    <div v-else flex="~" items-center justify-between>
                      <NuxtLink
                        hidden xl:block
                        rounded-2 text-primary text-start w-full
                        hover:bg-active cursor-pointer transition-100
                        :to="getAccountRoute(currentUser.account)"
                      >
                        <AccountInfo :account="currentUser.account" md:break-words square />
                      </NuxtLink>
                      <UserDropdown />
                    </div>
                  </div>
                  <UserDropdown xl:hidden />
                </div>
              </div>
            </div>
          </slot>
        </div>
      </aside>
      <div w-full min-h-screen :class="isHydrated && wideLayout ? 'lg:w-full sm:w-600px' : 'sm:w-600px md:shrink-0'" border-base>
        <div min-h="[calc(100vh-3.5rem)]" sm:min-h-screen>
          <slot />
        </div>
        <div sticky left-0 right-0 bottom-0 z-10 bg-base pb="[env(safe-area-inset-bottom)]" transition="padding 20">
          <CommonOfflineChecker v-if="isHydrated" />
          <NavBottom v-if="isHydrated" sm:hidden />
        </div>
      </div>
      <aside v-if="isHydrated && !wideLayout" class="hidden sm:none lg:block lg:w-1/3 xl:max-w-30dvw zen-hide">
        <div sticky top-0 h-100dvh flex="~ col" gap-2 py3 ms-2>
          <slot name="right">
            <DrawerContent />
          </slot>
        </div>
      </aside>
    </main>
    <ModalContainer />
  </div>
</template>
