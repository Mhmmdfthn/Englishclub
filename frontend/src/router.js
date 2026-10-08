import { createRouter, createWebHistory } from 'vue-router'
import LandingView from './components/LandingView.vue'
import PlayFormView from './components/PlayFormView.vue'
import LeaderboardPage from './components/LeaderboardPage.vue'
import MemberSignupView from './components/MemberSignupView.vue'
import MemberLoginView from './components/MemberLoginView.vue'
import MemberDashboardView from './components/MemberDashboardView.vue'
import SoonView from './components/SoonView.vue'

// Flag deploy: VITE_MEMBER_AUTH_ENABLED=false (Vercel production) -> halaman auth jadi "Segera Hadir".
// Default ON (lokal & preview). Dibake saat build -> perlu rebuild setelah ubah env.
const MEMBER_AUTH_ON = import.meta.env.VITE_MEMBER_AUTH_ENABLED !== 'false'
import ProgramArticle from './components/ProgramArticle.vue'

const AdminView = () => import('./components/AdminView.vue')

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
    // Pendaftaran disembunyikan sementara: /daftar dialihkan ke landing
    { path: '/daftar', redirect: '/' },
    { path: '/buat-akun', name: 'signup', component: MEMBER_AUTH_ON ? MemberSignupView : SoonView },
    { path: '/masuk', name: 'login', component: MEMBER_AUTH_ON ? MemberLoginView : SoonView },
    { path: '/dashboard', name: 'dashboard', component: MemberDashboardView },
    { path: '/program/:id', name: 'program-article', component: ProgramArticle },
    { path: '/ec-admin-2026', name: 'admin', component: AdminView, beforeEnter: adminGuard, meta: { hidden: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
