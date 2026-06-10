import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import teams from '../assets/data/teams.json'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const profile = ref(null)

  const team = computed(() =>
    profile.value?.teamId
      ? teams.find(t => t.id === profile.value.teamId) ?? null
      : null
  )

  function setUser(firebaseUser) {
    user.value = firebaseUser
  }

  function setProfile(doc) {
    profile.value = doc
  }

  function clearUser() {
    user.value = null
    profile.value = null
  }

  return { user, profile, team, setUser, setProfile, clearUser }
})
