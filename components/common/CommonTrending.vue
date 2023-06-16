<script lang="ts" setup>
import type { mastodon } from 'masto'

const {
  history,
  maxDay = 2,
  metric = 'accounts',
} = $defineProps<{
  history: mastodon.v1.TagHistory[]
  maxDay?: number
  metric: 'persons' | 'posts'
}>()

const ongoingHot = $computed(() => {
  if (maxDay !== undefined)
    history.slice(0, maxDay)
  return history
})

const usage = $computed(() =>
  ongoingHot.reduce((total: number, item) => total + (Number(
    (metric === 'posts') ? item.uses : item.accounts,
  ) || 0), 0),
)
</script>

<template>
  <p v-if="metric === 'posts'">
    {{ $t('trends.n-posts', [usage]) }}
  </p>
  <p v-else>
    {{ $t('command.n-people-in-the-past-n-days', [usage, maxDay]) }}
  </p>
</template>
