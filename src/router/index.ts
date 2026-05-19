import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    // Если есть сохранённая позиция (браузер "назад"/"вперёд")
    if (savedPosition) {
      return savedPosition
    }
    // Если переходим на другую страницу
    if (to.path !== from.path) {
      return { top: 0 }
    }
    // Сохраняем позицию при изменении query params
    return false
  },
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      component: () => import('../layouts/AuthLayout.vue'),
      children: [
        {
          path: '',
          name: 'login',
          component: () => import('../views/LoginView.vue'),
        },
      ],
    },
    {
      path: '/discounts',
      component: () => import('../layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'discounts',
          component: () => import('../views/DiscountsCatalogView.vue'),
        },
        {
          path: ':slug',
          name: 'discount-details',
          component: () => import('../views/DiscountDetailsView.vue'),
          props: (route) => ({ slug: route.params.slug }),
        },
      ],
    },
    {
      path: '/faq',
      component: () => import('../layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'faq',
          component: () => import('../views/FaqView.vue'),
        },
      ],
    },
    // Устаревший маршрут админки - редирект на новую админку
    {
      path: '/admin/partners-legacy',
      name: 'partners-admin-legacy',
      component: () => import('../views/PartnersAdminView.vue'),
    },
    // Новая админ-панель
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'partners',
          name: 'admin-partners',
          component: () => import('../views/admin/AdminPartnersView.vue'),
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: () => import('../views/admin/AdminCategoriesView.vue'),
        },
        {
          path: 'locations',
          name: 'admin-locations',
          component: () => import('../views/admin/AdminLocationsView.vue'),
        },
        {
          path: 'faq',
          name: 'admin-faq',
          component: () => import('../views/admin/AdminFaqView.vue'),
        },
        {
          path: 'texts',
          name: 'admin-texts',
          component: () => import('../views/admin/AdminTextsView.vue'),
        },
        {
          path: 'images',
          name: 'admin-images',
          component: () => import('../views/admin/AdminImagesView.vue'),
        },
        {
          path: 'analytics',
          name: 'admin-analytics',
          component: () => import('../views/admin/AdminAnalyticsView.vue'),
        },
        {
          path: 'history',
          name: 'admin-history',
          component: () => import('../views/admin/AdminAuditLogView.vue'),
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('../views/admin/AdminSettingsView.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('../views/admin/AdminUsersView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
})

// Navigation guard для проверки авторизации
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Публичные маршруты (не требуют авторизации) — ТОЛЬКО login
  const isPublicRoute = to.path === '/login'

  // Админ-маршруты (требуют роль admin или editor)
  const isAdminRoute = to.path.startsWith('/admin')

  // Если пользователь не авторизован и пытается попасть на защищенный маршрут
  if (!authStore.isLoggedIn && !isPublicRoute) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Если пользователь авторизован и пытается попасть на страницу логина
  if (authStore.isLoggedIn && to.path === '/login') {
    await authStore.ensureAdminAccessReady()
    next({ name: authStore.hasAdminAccess ? 'admin-dashboard' : 'discounts' })
    return
  }

  // Проверка доступа к админке — только admin или editor
  if (isAdminRoute && authStore.isLoggedIn) {
    // Проверяем валидность токена ПЕРЕД входом в админку
    if (authStore.checkTokenExpired()) {
      // Пытаемся silent refresh
      const refreshSuccess = await authStore.silentRefresh()
      if (!refreshSuccess) {
        // Токен истёк и refresh не удался — logout и редирект на логин
        authStore.logout()
        next({ name: 'login', query: { redirect: to.fullPath, expired: '1' } })
        return
      }
    }

    await authStore.ensureAdminAccessReady()

    if (!authStore.hasAdminAccess) {
      // Нет доступа к админке — редирект на главную
      console.warn('[router] no admin access for:', authStore.user?.email)
      next({ name: 'discounts' })
      return
    }

    // Страница пользователей доступна только для admin (не editor)
    if (to.path === '/admin/users' && !authStore.isAdmin) {
      console.warn('[router] users page requires admin role:', authStore.user?.email)
      next({ name: 'admin-dashboard' })
      return
    }
  }

  next()
})

export default router
