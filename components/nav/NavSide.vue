<script setup lang="ts">
const { command } = defineProps<{
  command?: boolean
}>()

const route = useRoute()
const disableCompose = computed(() => route.path?.startsWith('/compose'))

const { countNotifications } = useNotifications()
const { countUnreadConversations } = useConversations()
</script>

<template>
  <nav sm:px3 flex="~ col gap2" shrink text-size-base leading-normal md:text-xl h-full my-1 place-content-evenly xl:place-content-start overflow-y-auto>
    <NavSideItem :text="$t('nav.home')" to="/home" icon="i-ri:home-5-line" user-only :command="command" :replace="true" />
    <NavSideItem :text="$t('nav.search')" to="/search" icon="i-ri:search-line" xl:hidden :command="command" :replace="true" />
    <NavSideItem :text="$t('nav.explore')" :to="isHydrated ? `/${currentServer}/explore` : '/explore'" icon="i-ri:hashtag" :command="command" :replace="true" />
    <NavSideItem :text="$t('nav.notifications')" to="/notifications" icon="i-ri:notification-4-line" user-only :command="command" :replace="true">
      <template #icon>
        <div flex relative>
          <div class="i-ri:notification-4-line" text-xl />
          <div v-if="countNotifications > 0" class="top-[-0.4rem] right-[-0.4rem] h-1.25rem w-1.25rem" absolute font-bold rounded-full text-xs bg-primary text-inverted flex items-center justify-center>
            {{ countNotifications < 100 ? countNotifications : '•' }}
          </div>
        </div>
      </template>
    </NavSideItem>
    <NavSideItem :text="$t('nav.conversations')" to="/conversations" icon="i-ri:mail-line" user-only :command="command" :replace="true">
      <template #icon>
        <div flex relative>
          <div class="i-ri:mail-line" text-xl />
          <div v-if="countUnreadConversations > 0" class="top-[-0.4rem] right-[-0.4rem] h-1.25rem w-1.25rem" absolute font-bold rounded-full text-xs bg-primary text-inverted flex items-center justify-center>
            {{ countUnreadConversations < 100 ? countUnreadConversations : '•' }}
          </div>
        </div>
      </template>
    </NavSideItem>
    <NavSideItem :text="$t('nav.lists')" :to="isHydrated ? `/${currentServer}/lists` : '/lists'" icon="i-ri:file-list-line" user-only :command="command" :replace="true" />
    <NavSideItem :text="$t('nav.bookmarks')" to="/bookmarks" icon="i-ri:bookmark-line" user-only :command="command" :replace="true" />

    <NavSideMoreDropdown :command="command" :text="$t('action.more')" />

    <div class="spacer" shrink hidden sm:block />
    <CommonFloatingActionButton :text="$t('action.compose')" to="/compose" icon="i-ri:quill-pen-line" user-only :command="command" :replace="false" :disable="disableCompose" />
  </nav>
</template>

<style scoped>
  .spacer {
    margin-top: 0.5em;
  }
  @media screen and ( max-height: 920px ) and ( min-width: 640px ) {
    .spacer {
      margin-top: 0;
    }
  }
</style>
