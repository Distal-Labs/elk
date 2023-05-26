<script setup lang="ts">
const { env } = useBuildInfo()
const router = useRouter()
const backRef = ref<string>('')

onMounted(() => {
  backRef.value = '/'
})
router.afterEach(async (to, from) => {
  if ((router.currentRoute.value.name === 'home') || (router.currentRoute.value.name === 'index') || (router.currentRoute.value.name === null))
    backRef.value = ''
  else
    backRef.value = router.currentRoute.value.path
})

async function handleBackClick() {
  if ((router.options.history.state.back === 'home'))
    await router.replace('/home')
  else if ((router.options.history.state.back === 'index') || (router.options.history.state.back === null) || backRef.value === '')
    await router.replace('/')
  else
    router.go(-1)
}
</script>

<template>
  <div flex justify-between sticky top-0 bg-base z-1 py-4 native:py-7 data-tauri-drag-region>
    <NuxtLink
      flex items-end gap-3
      py2 px-5
      text-2xl
      select-none
      focus-visible:ring="2 current"
      to="/"
      external
    >
      <NavLogo shrink-0 aspect="1/1" sm:h-8 xl:h-10 class="rtl-flip" />
      <div v-show="isHydrated" hidden xl:block text-secondary>
        {{ $t('app_name') }} <sup text-sm italic mt-1>{{ env === 'release' ? 'alpha+QTs' : env }}</sup>
      </div>
    </NuxtLink>
    <div
      hidden xl:flex items-center me-8 mt-2 gap-1
    >
      <CommonTooltip :content="$t('nav.back')">
        <NuxtLink
          :aria-label="$t('nav.back')"
          :class="{ 'pointer-events-none op0': !backRef || backRef === '', 'xl:flex': $route.name !== 'tag' }"
          @click="handleBackClick"
        >
          <div text-xl i-ri:arrow-left-line class="rtl-flip" btn-text />
        </NuxtLink>
      </CommonTooltip>
    </div>
  </div>
</template>
