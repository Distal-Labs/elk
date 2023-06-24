<script setup lang="ts">
// limit: 20 is the default configuration of the official client
const paginator = useMastoClient().v2.suggestions.list({ limit: 20 })
</script>

<template v-if="isHydrated">
  <div max-h-70dvh overscroll-y-contain overflow-y-auto overflow-x-hidden>
    <CommonPaginator :paginator="paginator" key-prop="account">
      <template #default="{ item }">
        <div px0 py4 me-3>
          <AccountCompactCard
            :account="item.account"
            as="router-link"
            :to="getAccountRoute(item.account)"
          />
        </div>
      </template>
      <template #loading>
        <AccountBigCardSkeleton border="b base" />
        <AccountBigCardSkeleton border="b base" op50 />
        <AccountBigCardSkeleton border="b base" op25 />
      </template>
    </CommonPaginator>
    <!-- <div v-if="paginator && stream" max-h-100vh overscroll-y-contain overflow-y-auto>
      <TimelinePaginator v-bind="{ paginator, stream }" :preprocess="reorderAndFilter" :context="isLoading ? 'public' : 'home'" :is-compact="true" />
    </div> -->
    <div p5 mb-5dvh />
  </div>
</template>
