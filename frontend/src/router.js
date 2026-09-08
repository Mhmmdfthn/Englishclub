import { createRouter, createWebHistory } from 'vue-router'
import LandingView from './components/LandingView.vue'
import PlayFormView from './components/PlayFormView.vue'
import LeaderboardPage from './components/LeaderboardPage.vue'
import MemberRegisterMini from './components/MemberRegisterMini.vue'
import AdminView from './components/AdminView.vue'

function adminGuard() {
  // auth handled inside AdminView via /api/admin/verify (server-side)
  return true
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingView },
    { path: '/main', name: 'play-form', component: PlayFormView },
    { path: '/board', name: 'board', component: LeaderboardPage },
    { path: '/daftar', name: 'register', component: MemberRegisterMini },
    { path: '/ec-admin-2026', name: 'admin', component: AdminView, beforeEnter: adminGuard, meta: { hidden: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() { return { top: 0 } },
})

export default router
