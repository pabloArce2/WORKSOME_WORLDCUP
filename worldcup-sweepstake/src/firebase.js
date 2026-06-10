import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)

// Resolves once Firebase has finished restoring the session from cache.
// The router awaits this before making any redirect decisions.
export const authReady = new Promise(resolve => {
  const unsub = onAuthStateChanged(auth, user => {
    resolve(user)
    unsub()
  })
})
