<template>
  <RouterView />
</template>

<script setup>
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { useUserStore } from './stores/user.js'

const store = useUserStore()

// Re-hydrate the store whenever Firebase restores a cached session.
// This covers both first load and token refresh.
onAuthStateChanged(auth, async user => {
  if (user) {
    store.setUser(user)
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) store.setProfile(snap.data())
  } else {
    store.clearUser()
  }
})
</script>
