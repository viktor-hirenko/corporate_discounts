import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/discounts',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../layouts/AuthLayout.vue'),
      children: [
        {
          path: '',
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
      name: 'faq',
      component: () => import('../layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          component: () => import('../views/FaqView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/discounts',
    },
  ],
})

export default router
