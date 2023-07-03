<script setup lang="ts">
const { command } = defineProps<{
  text?: string
  command?: boolean
}>()

const emit = defineEmits<{
  (event: 'click'): void
}>()

const useStarFavoriteIcon = usePreferences('useStarFavoriteIcon')

const { width: windowWidth, height: windowHeight } = useWindowSize()
const isShortWindow = computed(() => windowHeight.value < 720)
const isLargeWidthWindow = computed(() => windowWidth.value >= 1024)
</script>

<template>
  <div sm:min-w-80 max-w-100vw mxa py2 flex="~ col" @click="emit('click')">
    <NavSideMoreMenuItem v-if="isLargeWidthWindow" :text="$t('nav.search')" to="/search" icon="i-ri:search-line" :command="command" :replace="true" />
    <NavSideMoreMenuItem v-if="isShortWindow" :text="$t('nav.explore')" :to="isHydrated ? `/${currentServer}/explore` : '/explore'" icon="i-ri:hashtag" :command="command" :replace="true" />
    <NavSideMoreMenuItem v-if="isShortWindow" :text="$t('nav.bookmarks')" to="/bookmarks" icon="i-ri:bookmark-line" user-only :command="command" :replace="true" />
    <NavSideMoreMenuItem :text="$t('nav.favourites')" to="/favourites" :icon="useStarFavoriteIcon ? 'i-ri:star-line' : 'i-ri:heart-3-line'" user-only :command="command" :replace="true" />
    <NavSideMoreMenuItem :text="$t('nav.local')" :to="isHydrated ? `/${currentServer}/public/local` : '/public/local'" icon="i-ri:group-2-line " :command="command" :replace="true" />
    <NavSideMoreMenuItem :text="$t('nav.federated')" :to="isHydrated ? `/${currentServer}/public` : '/public'" icon="i-ri:earth-line" :command="command" :replace="true" />
    <div border="t base" pt2>
      <NavSideMoreMenuItem :text="$t('nav.settings')" to="/settings" icon="i-ri:settings-3-line" :command="command" />
    </div>
  </div>
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
