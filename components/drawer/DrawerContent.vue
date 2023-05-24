<script setup lang="ts">
</script>

<template>
  <div flex="~ col" justify-between h-full w-full overflow-x-hidden>
    <SearchWidget my-4 mx-4 hidden lg:block />

    <div
      v-if="isHydrated && currentUser"
      flex
      flex-col
      overflow-y-scroll
      overflow-x-clip
      max-w-full
      scrollbar-hide
      border-t-2
      mx-4 pt-4
      class="zen-hide"
    >
      <DrawerNotifications v-if="isHydrated && currentUser" />
    </div>
  </div>
</template>
