import { DEFAULT_FONT_SIZE } from '~/constants'

export type FontSize = `${number}px`

// Temporary type for backward compatibility
export type OldFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type ColorMode = 'light' | 'dim' | 'dark' | 'system'

export interface PreferencesSettings {
  hideAltIndicatorOnPosts: boolean
  hideBoostCount: boolean
  hideReplyCount: boolean
  hideFavoriteCount: boolean
  hideFollowerCount: boolean
  hideTranslation: boolean
  hideUsernameEmojis: boolean
  hideAccountHoverCard: boolean
  hideNews: boolean
  grayscaleMode: boolean
  enableAutoplay: boolean
  enableDataSaving: boolean
  enablePinchToZoom: boolean
  useStarFavoriteIcon: boolean
  zenMode: boolean
  experimentalVirtualScroller: boolean
  experimentalGitHubCards: boolean
  experimentalUserPicker: boolean
  // Fedified extensions
  excludeMissingAltTextInHome: boolean
  excludeBoostsInHome: boolean
  excludeBotsInHome: boolean
  excludeDMsInHome: boolean
  excludeNonThreadRepliesInHome: boolean
  excludeThreadRepliesInHome: boolean
  excludeCWsInHome: boolean
  excludeSexuallyExplicitInHome: boolean
  excludeTwitterBacklinksInHome: boolean
  excludeTwitterCrosspostsInHome: boolean

  excludeMissingAltTextInNotifications: boolean
  excludeAltTextMinderInNotifications: boolean
  excludeBoostsInNotifications: boolean
  excludeDMsInNotifications: boolean
  excludeMentionsFromUnfamiliarAccountsInNotifications: boolean
  excludeNSFWInNotifications: boolean
  excludeSpammersInNotifications: boolean

  excludeCWsInMessages: boolean
  excludeSexuallyExplicitInMessages: boolean
  excludeUnfamiliarAccountsInMessages: boolean
  excludeSpammersInMessages: boolean

  excludeAltTextMinderInThread: boolean
  excludeBotsInThread: boolean
  excludeNewAccountsInThread: boolean
  excludeCWsInThread: boolean
  excludeSexuallyExplicitInThread: boolean

  excludeMissingAltTextInGlobal: boolean
  excludeBoostsInGlobal: boolean
  excludeBotsInGlobal: boolean
  excludeThreadRepliesInGlobal: boolean
  excludeCWsInGlobal: boolean
  excludeSexuallyExplicitInGlobal: boolean
  excludeSpammersInGlobal: boolean

  experimentalAntagonistFilterLevel: number
}

export interface UserSettings {
  preferences: Partial<PreferencesSettings>
  colorMode?: ColorMode
  fontSize: FontSize
  language: string
  disabledTranslationLanguages: string[]
  themeColors?: ThemeColors
}

export interface ThemeColors {
  '--theme-color-name': string

  '--c-primary': string
  '--c-primary-active': string
  '--c-primary-light': string
  '--c-primary-fade': string
  '--c-dark-primary': string
  '--c-dark-primary-active': string
  '--c-dark-primary-light': string
  '--c-dark-primary-fade': string

  '--rgb-primary': string
  '--rgb-dark-primary': string
}

export function getDefaultLanguage(languages: string[]) {
  if (process.server)
    return 'en-US'
  return matchLanguages(languages, navigator.languages) || 'en-US'
}

export const DEFAULT__PREFERENCES_SETTINGS: PreferencesSettings = {
  hideAltIndicatorOnPosts: false,
  hideBoostCount: false,
  hideReplyCount: false,
  hideFavoriteCount: false,
  hideFollowerCount: false,
  hideTranslation: false,
  hideUsernameEmojis: false,
  hideAccountHoverCard: false,
  hideNews: false,
  grayscaleMode: false,
  enableAutoplay: true,
  enableDataSaving: false,
  enablePinchToZoom: false,
  useStarFavoriteIcon: false,
  zenMode: false,
  experimentalVirtualScroller: false,
  experimentalGitHubCards: true,
  experimentalUserPicker: true,
  // Fedified extensions
  excludeMissingAltTextInHome: false,
  excludeBoostsInHome: false,
  excludeBotsInHome: false,
  excludeDMsInHome: true,
  excludeNonThreadRepliesInHome: false,
  excludeThreadRepliesInHome: true,
  excludeCWsInHome: false,
  excludeSexuallyExplicitInHome: false,
  excludeTwitterBacklinksInHome: true,
  excludeTwitterCrosspostsInHome: false,

  excludeMissingAltTextInNotifications: false,
  excludeAltTextMinderInNotifications: true,
  excludeBoostsInNotifications: true,
  excludeDMsInNotifications: true,
  excludeNSFWInNotifications: false,
  excludeMentionsFromUnfamiliarAccountsInNotifications: false,
  excludeSpammersInNotifications: true,

  excludeUnfamiliarAccountsInMessages: false,
  excludeCWsInMessages: true,
  excludeSexuallyExplicitInMessages: true,
  excludeSpammersInMessages: true,

  excludeAltTextMinderInThread: true,
  excludeBotsInThread: true,
  excludeNewAccountsInThread: true,
  excludeCWsInThread: false,
  excludeSexuallyExplicitInThread: true,

  excludeMissingAltTextInGlobal: false,
  excludeBoostsInGlobal: true,
  excludeBotsInGlobal: true,
  excludeThreadRepliesInGlobal: true,
  excludeCWsInGlobal: true,
  excludeSexuallyExplicitInGlobal: true,
  excludeSpammersInGlobal: true,

  experimentalAntagonistFilterLevel: 0,
}

export function getDefaultUserSettings(locales: string[]): UserSettings {
  return {
    language: getDefaultLanguage(locales),
    fontSize: DEFAULT_FONT_SIZE,
    disabledTranslationLanguages: [],
    preferences: DEFAULT__PREFERENCES_SETTINGS,
  }
}
