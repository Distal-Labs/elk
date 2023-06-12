<script setup lang="ts">
const account = currentUser.value?.account.id
const paginator = account ? useMastoClient().v1.accounts.listStatuses(account, { pinned: true }) : null
</script>

<template>
  <template v-if="paginator">
    <TimelinePaginator :paginator="paginator" />
  </template>
</template>
