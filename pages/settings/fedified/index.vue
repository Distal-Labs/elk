<script setup lang="ts">
const { t } = useI18n()

useHydratedHead({
  title: () => `${t('settings.fedified.label')} | ${t('nav.settings')}`,
})

const userSettings = useUserSettings()
</script>

<template>
  <MainContent back-on-small-screen>
    <template #title>
      <h1 text-lg font-bold flex items-center gap-2 @click="$scrollToTop">
        <div i-ri-sparkling-line />
        {{ $t('settings.fedified.label') }}
      </h1>
    </template>

    <!-- HOME FEED -->
    <h2 px6 py4 mt2 font-bold text-xl flex="~ gap-1" items-center>
      <div i-ri-home-5-line />
      {{ $t('settings.fedified.feeds.home.label') }}
    </h2>
    <div pl2 font-light text-5 leading-none mb-6>
      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_missing_alt_text')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_missing_alt_text', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeMissingAltTextInHome')"
        @click="togglePreferences('excludeMissingAltTextInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_boosts')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_boosts', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeBoostsInHome')"
        @click="togglePreferences('excludeBoostsInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_bots')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_bots', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeBotsInHome')"
        @click="togglePreferences('excludeBotsInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_dms')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_dms', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeDMsInHome')"
        @click="togglePreferences('excludeDMsInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_nonthread_replies')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_nonthread_replies', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeNonThreadRepliesInHome')"
        @click="togglePreferences('excludeNonThreadRepliesInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_threads')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_threads', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeThreadRepliesInHome')"
        @click="togglePreferences('excludeThreadRepliesInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_cw')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_cw', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeCWsInHome')"
        @click="togglePreferences('excludeCWsInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_sexually_explicit')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_sexually_explicit', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeSexuallyExplicitInHome')"
        @click="togglePreferences('excludeSexuallyExplicitInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_twitter_backlinks')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_twitter_backlinks', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeTwitterBacklinksInHome')"
        @click="togglePreferences('excludeTwitterBacklinksInHome')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.home.exclude_twitter_crossposts')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_twitter_crossposts', ['Home'])"
        :checked="getPreferences(userSettings, 'excludeTwitterCrosspostsInHome')"
        @click="togglePreferences('excludeTwitterCrosspostsInHome')"
      />
    </div>
    <!-- NOTIFICATIONS FEED -->
    <h2 px6 py4 mt2 font-bold text-xl flex="~ gap-1" items-center>
      <div i-ri-notification-4-line />
      {{ $t('settings.fedified.feeds.notifications.label') }}
    </h2>

    <div pl2 font-light text-5 leading-none mb-6>
      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.notifications.exclude_missing_alt_text')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_missing_alt_text', ['Notifications'])"
        :checked="getPreferences(userSettings, 'excludeMissingAltTextInNotifications')"
        @click="togglePreferences('excludeMissingAltTextInNotifications')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.notifications.exclude_alt_text_minder_notifications')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_alt_text_minder_notifications', ['Notifications'])"
        :checked="getPreferences(userSettings, 'excludeAltTextMinderInNotifications')"
        @click="togglePreferences('excludeAltTextMinderInNotifications')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.notifications.exclude_boosts')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_boosts', ['Notifications'])"
        :checked="getPreferences(userSettings, 'excludeBoostsInNotifications')"
        @click="togglePreferences('excludeBoostsInNotifications')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.notifications.exclude_dms')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_dms', ['Notifications'])"
        :checked="getPreferences(userSettings, 'excludeDMsInNotifications')"
        @click="togglePreferences('excludeDMsInNotifications')"
      />

      <!-- <SettingsToggleItem
        :text="$t('settings.fedified.feeds.notifications.exclude_mentions_from_unfamiliar')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_mentions_from_unfamiliar', ['Notifications'])"
        :checked="getPreferences(userSettings, 'excludeMentionsFromUnfamiliarAccountsInNotifications')"
        @click="togglePreferences('excludeMentionsFromUnfamiliarAccountsInNotifications')"
      /> -->

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.notifications.exclude_nsfw')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_nsfw', ['Notifications'])"
        :checked="getPreferences(userSettings, 'excludeNSFWInNotifications')"
        @click="togglePreferences('excludeNSFWInNotifications')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.notifications.exclude_spammers')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_spammers', ['Notifications'])"
        :checked="getPreferences(userSettings, 'excludeSpammersInNotifications')"
        @click="togglePreferences('excludeSpammersInNotifications')"
      />
    </div>
    <!-- MESSAGES FEED -->
    <h2 px6 py4 mt2 font-bold text-xl flex="~ gap-1" items-center>
      <div i-ri-mail-line />
      {{ $t('settings.fedified.feeds.messages.label') }}
    </h2>
    <div pl2 font-light text-5 leading-none mb-6>
      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.messages.exclude_cw')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_cw', ['Messages'])"
        :checked="getPreferences(userSettings, 'excludeCWsInMessages')"
        @click="togglePreferences('excludeCWsInMessages')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.messages.exclude_sexually_explicit')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_sexually_explicit', ['Messages'])"
        :checked="getPreferences(userSettings, 'excludeSexuallyExplicitInMessages')"
        @click="togglePreferences('excludeSexuallyExplicitInMessages')"
      />

      <!-- <SettingsToggleItem
        :text="$t('settings.fedified.feeds.messages.exclude_mentions_from_unfamiliar')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_mentions_from_unfamiliar', ['Messages'])"
        :checked="getPreferences(userSettings, 'excludeUnfamiliarAccountsInMessages')"
        @click="togglePreferences('excludeUnfamiliarAccountsInMessages')"
      /> -->

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.messages.exclude_spammers')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_spammers', ['Messages'])"
        :checked="getPreferences(userSettings, 'excludeSpammersInMessages')"
        @click="togglePreferences('excludeSpammersInMessages')"
      />
    </div>
    <!-- THREAD FEED -->
    <h2 px6 py4 mt2 font-bold text-xl flex="~ gap-1" items-center>
      <div i-ri-notification-4-line />
      {{ $t('settings.fedified.feeds.thread.label') }}
    </h2>

    <div pl2 font-light text-5 leading-none mb-6>
      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.thread.exclude_alt_text_minder_thread')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_alt_text_minder_thread', ['Replies'])"
        :checked="getPreferences(userSettings, 'excludeAltTextMinderInThread')"
        @click="togglePreferences('excludeAltTextMinderInThread')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.thread.exclude_bots')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_bots_thread', ['Replies'])"
        :checked="getPreferences(userSettings, 'excludeBotsInThread')"
        @click="togglePreferences('excludeBotsInThread')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.thread.exclude_new_accounts')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_new_accounts_thread', ['Replies'])"
        :checked="getPreferences(userSettings, 'excludeNewAccountsInThread')"
        @click="togglePreferences('excludeNewAccountsInThread')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.thread.exclude_cw')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_cw', ['Replies'])"
        :checked="getPreferences(userSettings, 'excludeCWsInThread')"
        @click="togglePreferences('excludeCWsInThread')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.thread.exclude_sexually_explicit')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_sexually_explicit', ['Replies'])"
        :checked="getPreferences(userSettings, 'excludeSexuallyExplicitInThread')"
        @click="togglePreferences('excludeSexuallyExplicitInThread')"
      />
    </div>
    <!-- GLOBAL FEED -->
    <h2 px6 py4 mt2 font-bold text-xl flex="~ gap-1" items-center>
      <div i-ri-earth-line />
      {{ $t('settings.fedified.feeds.global.label') }}
    </h2>
    <div pl2 font-light text-5 leading-none mb-16>
      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.global.exclude_missing_alt_text')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_missing_alt_text', ['Global'])"
        :checked="getPreferences(userSettings, 'excludeMissingAltTextInGlobal')"
        @click="togglePreferences('excludeMissingAltTextInGlobal')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.global.exclude_boosts')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_boosts', ['Global'])"
        :checked="getPreferences(userSettings, 'excludeBoostsInGlobal')"
        @click="togglePreferences('excludeBoostsInGlobal')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.global.exclude_bots')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_bots', ['Global'])"
        :checked="getPreferences(userSettings, 'excludeBotsInGlobal')"
        @click="togglePreferences('excludeBotsInGlobal')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.global.exclude_thread')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_threads', ['Global'])"
        :checked="getPreferences(userSettings, 'excludeThreadRepliesInGlobal')"
        @click="togglePreferences('excludeThreadRepliesInGlobal')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.global.exclude_cw')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_cw', ['Global'])"
        :checked="getPreferences(userSettings, 'excludeCWsInGlobal')"
        @click="togglePreferences('excludeCWsInGlobal')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.global.exclude_sexually_explicit')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_sexually_explicit', ['Global'])"
        :checked="getPreferences(userSettings, 'excludeSexuallyExplicitInGlobal')"
        @click="togglePreferences('excludeSexuallyExplicitInGlobal')"
      />

      <SettingsToggleItem
        :text="$t('settings.fedified.feeds.global.exclude_spammers')"
        :tooltip="$t('settings.fedified.feeds.tooltips.exclude_spammers', ['Global'])"
        :checked="getPreferences(userSettings, 'excludeSpammersInGlobal')"
        @click="togglePreferences('excludeSpammersInGlobal')"
      />
    </div>
  </MainContent>
</template>
