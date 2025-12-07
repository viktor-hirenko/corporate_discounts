<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PrimaryButton from '@/components/PrimaryButton.vue'
import UiButton from '@/components/UiButton.vue'
import UiInput from '@/components/UiInput.vue'
import UserInfo from '@/components/UserInfo.vue'
import { useAppConfig } from '@/composables/useAppConfig'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUiStore()

const { images, getImage, auth, t, tTemplate } = useAppConfig()

const userFullName = ref('Імʼя Прізвище')
const userEmail = ref('')
const isLoading = ref(false)
const googleButtonRef = ref<HTMLDivElement | null>(null)

// Получаем данные последнего пользователя (для отображения после выхода)
const lastUser = ref<{ name: string; email: string; picture: string | null } | null>(null)

// Определяем, показывать ли Google кнопку
// Кнопка показывается только если пользователь НЕ авторизован И нет данных последнего пользователя
// Если есть данные пользователя (Welcome back), кнопка Google не показывается
const shouldShowGoogleButton = computed(() => {
  return hasGoogleClientId.value && !authStore.isLoggedIn && !hasUserData.value
})

// Определяем, есть ли данные для отображения "Welcome back"
const hasUserData = computed(() => {
  return !!lastUser.value
})

// Аватар: сначала проверяем авторизованного пользователя, потом последнего пользователя
// НЕ используем placeholder - всегда должна быть иконка из Google
const avatarUrl = computed(() => {
  // Сначала проверяем авторизованного пользователя
  if (authStore.user?.picture) {
    console.log('[auth-login] Using avatar from authStore.user:', authStore.user.picture)
    return authStore.user.picture
  }
  // Потом проверяем последнего пользователя
  if (lastUser.value?.picture) {
    console.log('[auth-login] Using avatar from lastUser:', lastUser.value.picture)
    return lastUser.value.picture
  }
  // Если нет picture, возвращаем null (не показываем placeholder)
  console.warn('[auth-login] No avatar available, returning null')
  return null
})

// Имя: сначала проверяем авторизованного пользователя, потом последнего пользователя, иначе placeholder
const displayFullName = computed(() => {
  if (authStore.user?.name) {
    return authStore.user.name
  }
  if (lastUser.value?.name) {
    return lastUser.value.name
  }
  return userFullName.value
})

// Email: если есть данные последнего пользователя - показываем его, иначе пустое
const displayEmail = computed({
  get: () => {
    if (lastUser.value?.email) {
      return lastUser.value.email
    }
    return userEmail.value
  },
  set: (value: string) => {
    userEmail.value = value
  },
})

// Проверяем наличие Google Client ID
const hasGoogleClientId = computed(() => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  console.log('[auth-login] Google Client ID:', clientId ? 'найден' : 'не найден', clientId)
  return !!clientId && clientId !== 'your-google-client-id-here.apps.googleusercontent.com'
})

async function handleGoogleSignIn(response: { credential: string }): Promise<void> {
  try {
    isLoading.value = true

    // Сохраняем redirect до логина, чтобы использовать после
    const redirect = (route.query.redirect as string) || '/discounts'

    await authStore.loginWithGoogle(response.credential)

    // Обновляем данные последнего пользователя
    if (authStore.user) {
      lastUser.value = {
        name: authStore.user.name,
        email: authStore.user.email,
        picture: authStore.user.picture,
      }
    }

    // Редирект сразу после успешного логина, без задержек
    // Используем replace вместо push, чтобы не было истории возврата на login
    // Не используем await, чтобы редирект произошел немедленно
    router.replace(redirect).catch((error) => {
      console.error('[auth-login] Redirect failed', error)
    })
  } catch (error) {
    console.error('[auth-login] Google sign in failed', error)
    isLoading.value = false
    // TODO: показать ошибку пользователю
  }
}

function initializeGoogleSignIn(): void {
  if (!window.google?.accounts?.id || !googleButtonRef.value) {
    console.warn('[auth-login] Google accounts.id not available', {
      hasGoogle: !!window.google,
      hasAccounts: !!window.google?.accounts,
      hasId: !!window.google?.accounts?.id,
    })
    return
  }

  // Получаем CLIENT_ID из переменных окружения
  // В продакшене это должно быть в .env файле
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  if (!CLIENT_ID) {
    console.warn(
      '[auth-login] Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to .env file',
    )
    // Показываем кнопку даже без Client ID для визуальной проверки
    // В реальном приложении здесь должен быть реальный Client ID
    return
  }

  try {
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleGoogleSignIn,
      auto_select: true,
      cancel_on_tap_outside: true,
    })

    // Очищаем контейнер кнопки перед рендерингом (важно для перерендеринга при смене локали)
    if (googleButtonRef.value) {
      googleButtonRef.value.innerHTML = ''
    }

    // Локаль уже установлена через параметр hl в URL скрипта
    // Но для надежности также передаем locale в renderButton
    const googleLocale = uiStore.locale === 'en' ? 'en' : 'uk'

    window.google.accounts.id.renderButton(googleButtonRef.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: '100%',
      locale: googleLocale,
    })

    console.log('[auth-login] Google Sign In button rendered with locale:', googleLocale)
  } catch (error) {
    console.error('[auth-login] Failed to initialize Google Sign In', error)
  }
}

function loadGoogleSDKWithLocale(locale: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Проверяем, не загружен ли уже скрипт с правильной локалью
    const existingScript = document.querySelector(
      `script[src*="accounts.google.com/gsi/client"]`,
    ) as HTMLScriptElement | null

    // Если скрипт уже загружен и SDK доступен, просто резолвим
    if (window.google?.accounts?.id) {
      // Проверяем, совпадает ли локаль в URL скрипта
      if (existingScript?.src.includes(`hl=${locale}`)) {
        resolve()
        return
      }
      // Если локаль не совпадает, удаляем старый скрипт
      if (existingScript) {
        existingScript.remove()
        // Очищаем window.google для перезагрузки
        delete (window as any).google
      }
    }

    // Загружаем скрипт с параметром hl для локализации
    const script = document.createElement('script')
    script.src = `https://accounts.google.com/gsi/client?hl=${locale}`
    script.async = true
    script.defer = true

    script.onload = () => {
      // Ждем инициализации SDK
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval)
          console.log('[auth-login] Google SDK loaded with locale:', locale)
          resolve()
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.google?.accounts?.id) {
          reject(new Error('Google SDK failed to initialize'))
        }
      }, 10000)
    }

    script.onerror = () => {
      reject(new Error('Failed to load Google SDK'))
    }

    document.head.appendChild(script)
  })
}

function waitForGoogleSDK(): void {
  const locale = uiStore.locale === 'en' ? 'en' : 'uk'
  console.log('[auth-login] Loading Google SDK with locale:', locale)

  if (window.google?.accounts?.id) {
    // Проверяем, совпадает ли локаль
    const existingScript = document.querySelector(
      `script[src*="accounts.google.com/gsi/client"]`,
    ) as HTMLScriptElement | null
    // Если скрипт найден и локаль совпадает, используем существующий SDK
    if (existingScript && existingScript.src.includes(`hl=${locale}`)) {
      console.log('[auth-login] Google SDK already loaded with correct locale')
      initializeGoogleSignIn()
      return
    }
    // Если локаль не совпадает, удаляем старый скрипт
    if (existingScript) {
      console.log('[auth-login] Google SDK locale mismatch, removing old script')
      existingScript.remove()
      delete (window as any).google
    }
  }

  // Загружаем SDK с правильной локалью
  loadGoogleSDKWithLocale(locale)
    .then(() => {
      initializeGoogleSignIn()
    })
    .catch((error) => {
      console.error('[auth-login] Failed to load Google SDK:', error)
    })
}

async function handleContinue(): Promise<void> {
  const email = displayEmail.value.trim()
  if (!email) {
    return
  }

  try {
    isLoading.value = true

    // Сохраняем redirect до логина, чтобы использовать после
    const redirect = (route.query.redirect as string) || '/discounts'

    const name = displayFullName.value || email.split('@')[0]
    await authStore.loginWithEmail(email, name)

    // Обновляем данные последнего пользователя
    if (authStore.user) {
      lastUser.value = {
        name: authStore.user.name,
        email: authStore.user.email,
        picture: authStore.user.picture, // Сохраняем picture, если он есть
      }
    }

    // Редирект сразу после успешного логина, без задержек
    // Используем replace вместо push, чтобы не было истории возврата на login
    // Не используем await, чтобы редирект произошел немедленно
    router.replace(redirect).catch((error) => {
      console.error('[auth-login] Redirect failed', error)
    })
  } catch (error) {
    console.error('[auth-login] Email login failed', error)
    isLoading.value = false
  }
}

function handleSubmit(event: Event): void {
  event.preventDefault()
  void handleContinue()
}

async function handleSwitchAccount(event: Event): Promise<void> {
  event.preventDefault()
  // Очищаем данные последнего пользователя
  authStore.clearLastUser()
  lastUser.value = null
  userEmail.value = ''
  userFullName.value = 'Імʼя Прізвище'

  // Ждем обновления DOM после изменения lastUser
  await nextTick()

  // После очистки Google кнопка появится автоматически (shouldShowGoogleButton станет true)
  // Инициализируем Google SDK с правильной локалью
  if (shouldShowGoogleButton.value && googleButtonRef.value) {
    console.log('[auth-login] Re-initializing Google SDK after switch account')
    const googleLocale = uiStore.locale === 'en' ? 'en' : 'uk'
    const existingScript = document.querySelector(
      `script[src*="accounts.google.com/gsi/client"]`,
    ) as HTMLScriptElement | null

    // Проверяем, загружен ли SDK с правильной локалью
    if (window.google?.accounts?.id) {
      // Если локаль не совпадает, перезагружаем SDK
      if (!existingScript?.src.includes(`hl=${googleLocale}`)) {
        console.log('[auth-login] Google SDK locale mismatch after switch account, reloading')
        existingScript?.remove()
        delete (window as any).google
        await nextTick()
        try {
          await loadGoogleSDKWithLocale(googleLocale)
          await nextTick()
          initializeGoogleSignIn()
        } catch (error) {
          console.error('[auth-login] Failed to reload Google SDK after switch account:', error)
        }
      } else {
        // Локаль совпадает, просто инициализируем
        initializeGoogleSignIn()
      }
    } else {
      // SDK не загружен, загружаем с правильной локалью
      waitForGoogleSDK()
    }
  }
}

// Отслеживаем изменения shouldShowGoogleButton и инициализируем Google SDK когда нужно
watch(
  shouldShowGoogleButton,
  async (newValue, oldValue) => {
    if (newValue && !oldValue) {
      // Ждем обновления DOM
      await nextTick()

      if (googleButtonRef.value) {
        console.log('[auth-login] shouldShowGoogleButton changed to true, initializing Google SDK')
        // Всегда проверяем и используем правильную локаль из uiStore
        const googleLocale = uiStore.locale === 'en' ? 'en' : 'uk'
        const existingScript = document.querySelector(
          `script[src*="accounts.google.com/gsi/client"]`,
        ) as HTMLScriptElement | null

        // Если SDK уже загружен, проверяем локаль
        if (window.google?.accounts?.id) {
          // Если локаль не совпадает или скрипт не найден, перезагружаем SDK
          if (!existingScript || !existingScript.src.includes(`hl=${googleLocale}`)) {
            console.log(
              '[auth-login] Google SDK locale mismatch, reloading with correct locale:',
              googleLocale,
            )
            existingScript?.remove()
            delete (window as any).google
            await nextTick()
            try {
              await loadGoogleSDKWithLocale(googleLocale)
              await nextTick()
              initializeGoogleSignIn()
            } catch (error) {
              console.error('[auth-login] Failed to reload Google SDK:', error)
            }
          } else {
            // Локаль совпадает, просто инициализируем
            initializeGoogleSignIn()
          }
        } else {
          // SDK не загружен, загружаем с правильной локалью
          waitForGoogleSDK()
        }
      }
    }
  },
  { immediate: false },
)

// Отслеживаем изменения статуса авторизации и редиректим сразу при логине
watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      const redirect = (route.query.redirect as string) || '/discounts'
      router.replace(redirect).catch((error) => {
        console.error('[auth-login] Redirect on auth change failed', error)
      })
    }
  },
  { immediate: false },
)

// Отслеживаем изменения локали и перезагружаем Google SDK с новой локалью
watch(
  () => uiStore.locale,
  async (newLocale, oldLocale) => {
    // Пропускаем первую инициализацию (когда oldLocale еще undefined)
    if (oldLocale === undefined) {
      return
    }

    // Перезагружаем SDK только если кнопка должна быть видна
    if (!shouldShowGoogleButton.value || !googleButtonRef.value) {
      console.log('[auth-login] Locale changed but Google button is not visible, skipping reload')
      return
    }

    const googleLocale = newLocale === 'en' ? 'en' : 'uk'
    console.log(
      '[auth-login] Locale changed from',
      oldLocale,
      'to',
      newLocale,
      ', reloading Google SDK with locale:',
      googleLocale,
    )

    // Ждем обновления DOM
    await nextTick()

    // Удаляем старый скрипт если он есть
    const existingScript = document.querySelector(
      `script[src*="accounts.google.com/gsi/client"]`,
    ) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.remove()
      delete (window as any).google
    }

    // Очищаем контейнер кнопки
    if (googleButtonRef.value) {
      googleButtonRef.value.innerHTML = ''
    }

    // Ждем еще один тик для полной очистки DOM
    await nextTick()

    // Загружаем SDK с новой локалью
    try {
      await loadGoogleSDKWithLocale(googleLocale)
      // Ждем еще один тик после загрузки SDK
      await nextTick()
      initializeGoogleSignIn()
      console.log('[auth-login] Google button re-rendered with new locale:', googleLocale)
    } catch (error) {
      console.error('[auth-login] Failed to reload Google SDK with new locale:', error)
    }
  },
  { immediate: false },
)

onMounted(() => {
  console.log('[auth-login] Component mounted', {
    hasGoogleClientId: hasGoogleClientId.value,
    isLoggedIn: authStore.isLoggedIn,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  })

  // Если пользователь уже авторизован, редиректим на discounts немедленно
  // Используем replace и не await, чтобы редирект произошел синхронно
  if (authStore.isLoggedIn) {
    const redirect = (route.query.redirect as string) || '/discounts'
    router.replace(redirect).catch((error) => {
      console.error('[auth-login] Redirect on mount failed', error)
    })
    return
  }

  // Загружаем данные последнего пользователя для отображения
  const savedLastUser = authStore.getLastUser()
  console.log('[auth-login] Loading last user data', savedLastUser)
  if (savedLastUser) {
    lastUser.value = savedLastUser
    userEmail.value = savedLastUser.email
    // Устанавливаем имя только если оно есть, иначе оставляем дефолтное
    if (savedLastUser.name && savedLastUser.name.trim()) {
      userFullName.value = savedLastUser.name
    }
    console.log('[auth-login] Last user loaded', {
      name: savedLastUser.name,
      email: savedLastUser.email,
      picture: savedLastUser.picture,
      hasPicture: !!savedLastUser.picture,
      displayFullName: displayFullName.value,
      avatarUrl: avatarUrl.value,
    })
  }

  // Инициализируем Google Sign In если нужно показать кнопку
  // Кнопка показывается всегда когда пользователь не авторизован
  console.log('[auth-login] Checking Google button visibility', {
    hasGoogleClientId: hasGoogleClientId.value,
    isLoggedIn: authStore.isLoggedIn,
    hasUserData: hasUserData.value,
    shouldShowGoogleButton: shouldShowGoogleButton.value,
  })

  if (shouldShowGoogleButton.value) {
    console.log('[auth-login] Initializing Google Sign In - button should be visible')
    waitForGoogleSDK()
  } else {
    console.warn('[auth-login] Skipping Google Sign In initialization', {
      reason: !hasGoogleClientId.value
        ? 'No Google Client ID'
        : authStore.isLoggedIn
          ? 'User is logged in'
          : 'Unknown reason',
    })
  }
})

onUnmounted(() => {
  // Очистка при размонтировании не требуется для Google SDK
})
</script>

<template>
  <form class="auth-login" @submit="handleSubmit">
    <div class="auth-login__panel">
      <div class="auth-login__actions">
        <!-- Основной способ: Email авторизация -->
        <!-- Показываем UserInfo только если есть данные последнего пользователя -->
        <UserInfo
          v-if="hasUserData"
          v-model="displayEmail"
          :full-name="displayFullName"
          :image-src="avatarUrl"
          image-alt="User avatar"
        />

        <!-- Если нет данных пользователя, показываем только email поле -->
        <UiInput
          v-if="!hasUserData"
          v-model="displayEmail"
          class="auth-login__email-input"
          name="user-email"
          type="email"
          autocomplete="email"
          placeholder="Email@upstars.com"
        />

        <PrimaryButton
          class="auth-login__action"
          size="large"
          type="submit"
          :disabled="isLoading || !displayEmail.trim()"
          :label="hasUserData ? t(auth.continue) : t(auth.login)"
        />

        <!-- Альтернативный способ: Google авторизация (показываем всегда когда пользователь не авторизован) -->
        <div v-if="shouldShowGoogleButton" class="auth-login__divider">
          <span class="auth-login__divider-text">{{ t(auth.or) }}</span>
        </div>

        <div
          v-if="shouldShowGoogleButton"
          ref="googleButtonRef"
          class="auth-login__google-button"
        />

        <!-- "Не ви? ВИКОРИСТАТИ ІНШИЙ АКАУНТ" показываем только если есть данные пользователя -->
        <div v-if="hasUserData" class="auth-login__switch-wrapper">
          <span class="auth-login__switch-text">{{ t(auth.notYou) }}</span>
          <UiButton
            class="auth-login__switch-button"
            appearance="text"
            :label="t(auth.useAnotherAccount)"
            @click="handleSwitchAccount"
          />
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
.auth-login {
  display: flex;
  width: 100%;
  max-width: to-rem(640);
  padding: to-rem(32);
  flex-direction: column;
  gap: to-rem(40);
  background: var(--color-secondary-100);

  @include mq(null, lg) {
    width: 100%;
    padding: to-rem(24);
    border: none;
  }

  &__panel {
    display: contents;
  }

  &__actions {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: to-rem(16);
  }

  &__google-button {
    width: 100%;
    min-height: to-rem(40);
    display: flex;
    justify-content: center;
    align-items: center;

    // Google SDK сам управляет размерами кнопки через iframe
    // Не переопределяем размеры, только базовые стили
    :deep(iframe) {
      width: 100% !important;
      border: none !important;
      display: block !important;
    }
  }

  &__divider {
    display: flex;
    width: 100%;
    align-items: center;
    gap: to-rem(16);
    margin: to-rem(8) 0;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-secondary-300);
    }
  }

  &__divider-text {
    color: var(--color-secondary-500);
    font-size: to-rem(14);
    font-style: normal;
    white-space: nowrap;

    @include line-height(normal);
    @include font-weight(semibold);
  }

  &__switch-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: to-rem(4);
    text-align: center;
  }

  &__switch-text {
    color: var(--color-secondary-600);
    font-size: to-rem(16);
    font-style: normal;

    @include line-height(relaxed);
    @include font-weight(extrabold);
  }

  &__switch-button :deep(.ui-button__label) {
    color: var(--color-secondary-400);
    text-decoration: none;
    text-transform: none;
  }

  &__email-input {
    width: 100%;
  }
}
</style>
