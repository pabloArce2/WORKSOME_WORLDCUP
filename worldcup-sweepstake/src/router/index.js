import { createRouter, createWebHistory } from 'vue-router'
import { auth, authReady, db } from '../firebase.js'
import { doc, getDoc } from 'firebase/firestore'

const LoginPage     = () => import('../pages/LoginPage.vue')
const AssignPage    = () => import('../pages/AssignPage.vue')
const DashboardPage = () => import('../pages/DashboardPage.vue')
const RankingsPage  = () => import('../pages/RankingsPage.vue')

const routes = [
  { path: '/',          component: LoginPage },
  { path: '/assign',    component: AssignPage,    meta: { requiresAuth: true } },
  { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true, requiresTeam: true } },
  { path: '/rankings',  component: RankingsPage,  meta: { requiresAuth: true, requiresTeam: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  // Wait for Firebase to restore the cached session before deciding anything.
  await authReady

  const user = auth.currentUser

  if (to.meta.requiresAuth && !user) return '/'

  if (user) {
    if (to.path === '/') {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists() && snap.data().teamId) return '/dashboard'
      if (snap.exists()) return '/assign'
      return undefined
    }

    if (to.meta.requiresTeam) {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (!snap.exists() || !snap.data().teamId) return '/assign'
    }

    if (to.path === '/assign') {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists() && snap.data().teamId) return '/dashboard'
    }
  }
})

export default router
