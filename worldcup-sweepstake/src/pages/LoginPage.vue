<template>
  <div class="relative min-h-screen flex items-center justify-center overflow-hidden" style="background-color: #0D0014;">
    <!-- Background blobs -->
    <div class="blob w-96 h-96 -top-20 -left-20" style="background: #6B21A8;"></div>
    <div class="blob w-96 h-96 -bottom-20 -right-20" style="background: #6B21A8;"></div>

    <!-- Grid overlay -->
    <div class="grid-overlay absolute inset-0 pointer-events-none"></div>

    <!-- Login card -->
    <div class="relative z-10 flex flex-col items-center gap-8 px-8 py-12 rounded-2xl max-w-md w-full mx-4"
         style="background: rgba(22, 0, 32, 0.85); border: 1px solid rgba(124, 58, 237, 0.3); backdrop-filter: blur(12px);">

      <!-- Worksome branding -->
      <div class="flex flex-col items-center gap-5">
        <img src="/logo.png" alt="Worksome" style="height: 36px; width: auto; filter: invert(1);" />

        <!-- Divider + trophy -->
        <div class="flex items-center gap-3 w-full">
          <div class="flex-1 h-px" style="background: rgba(124,58,237,0.3);"></div>
          <span class="text-2xl">🏆</span>
          <div class="flex-1 h-px" style="background: rgba(124,58,237,0.3);"></div>
        </div>
      </div>

      <!-- Headline -->
      <div class="text-center -mt-2">
        <h1 class="text-3xl font-bold text-white tracking-tight mb-2">World Cup 2026 Sweepstake</h1>
        <p class="text-base" style="color: #C084FC;">Sign in with your Worksome account to claim your team</p>
      </div>

      <!-- Google Sign-In button -->
      <button
        @click="signIn"
        :disabled="loading"
        class="flex items-center gap-3 bg-white text-gray-800 font-semibold px-6 py-3 rounded-full text-base transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed w-full justify-center"
        style="box-shadow: 0 4px 15px rgba(0,0,0,0.3);"
        @mouseover="e => e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.5)'"
        @mouseleave="e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)'"
      >
        <!-- Google G logo -->
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>{{ loading ? 'Signing in…' : 'Continue with Google' }}</span>
      </button>

      <!-- Error -->
      <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>

      <!-- Footer -->
      <p class="text-xs" style="color: #6B7280;">Company internal use only</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { auth, provider, db } from '../firebase.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const store = useUserStore()
const loading = ref(false)
const error = ref('')

async function signIn() {
  loading.value = true
  error.value = ''
  try {
    const result = await signInWithPopup(auth, provider)
    const { user } = result

    if (!user.email?.endsWith('@worksome.com')) {
      await signOut(auth)
      error.value = 'Only @worksome.com accounts are allowed.'
      return
    }

    store.setUser(user)

    const userRef = doc(db, 'users', user.uid)
    const snap = await getDoc(userRef)

    if (snap.exists()) {
      store.setProfile(snap.data())
      if (snap.data().teamId) {
        router.push('/dashboard')
      } else {
        router.push('/assign')
      }
    } else {
      const profile = {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        teamId: null,
        assignedAt: null,
        winProbability: null,
      }
      await setDoc(userRef, profile)
      store.setProfile(profile)
      router.push('/assign')
    }
  } catch (e) {
    error.value = 'Sign-in failed. Please try again.'
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
