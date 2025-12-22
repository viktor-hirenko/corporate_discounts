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
    // Legacy admin route - redirect to new admin
    {
      path: '/admin/partners-legacy',
      name: 'partners-admin-legacy',
      component: () => import('../views/PartnersAdminView.vue'),
    },
    // New Admin Panel
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
    next({ name: 'discounts' })
    return
  }

  // Проверка доступа к админке — только admin или editor
  if (isAdminRoute && authStore.isLoggedIn) {
    // Убедимся что adminUsers store инициализирован
    const { useAdminUsersStore } = await import('@/stores/adminUsers')
    const usersStore = useAdminUsersStore()
    await usersStore.init()

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
