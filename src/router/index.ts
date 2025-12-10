import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
    {
      path: '/admin/partners',
      name: 'partners-admin',
      component: () => import('../views/PartnersAdminView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
})

// Navigation guard для проверки авторизации
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Публичные маршруты (не требуют авторизации)
  const publicRoutes = ['/login', '/admin/partners']
  const isPublicRoute = publicRoutes.includes(to.path)

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

  next()
})

export default router
