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
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/discounts',
      name: 'discounts',
      component: () => import('../views/DiscountsCatalogView.vue'),
    },
    {
      path: '/discounts/:slug',
      name: 'discount-details',
      component: () => import('../views/DiscountDetailsView.vue'),
      props: true,
    },
    {
      path: '/faq',
      name: 'faq',
      component: () => import('../views/FaqView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/discounts',
    },
  ],
})

export default router
