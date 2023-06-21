<script lang="ts" setup>
import type { mastodon } from 'masto'

const {
  tag,
  maxDay = undefined,
  metric = 'posts',
} = $defineProps<{
  tag: mastodon.v1.Tag
  maxDay?: number
  metric?: 'persons' | 'posts'
}>()

const { formatTrendingTagLabel } = useTrends()

const usage = computed(() => formatTrendingTagLabel(tag, maxDay, metric))
</script>

<template>
  <p v-if="metric === 'posts'">
    {{ $t('trends.n-posts', [usage]) }}
  </p>
  <p v-else>
    {{ $t('command.n-people-in-the-past-n-days', [usage, maxDay]) }}
  </p>
</template>
