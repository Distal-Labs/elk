<script lang="ts" setup>
import type { mastodon } from 'masto'

const {
  history,
  maxDay = 2,
  metric = 'accounts',
} = $defineProps<{
  history: mastodon.v1.TagHistory[]
  maxDay?: number
  metric?: 'persons' | 'posts'
}>()

const usage = $computed(() => computeTagUsage(history, maxDay, metric))
</script>

<template>
  <p v-if="metric === 'posts'">
    {{ $t('trends.n-posts', [usage]) }}
  </p>
  <p v-else>
    {{ $t('command.n-people-in-the-past-n-days', [usage, maxDay]) }}
  </p>
</template>
