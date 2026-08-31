import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  userId: string
  email: string
  fullName: string
  phoneNumber?: string | null
  role: string
  status: string
  gender?: string | null
  roleSelected?: boolean
  roleSelectedAt?: string | null
  emailVerified?: boolean
  createdAt?: string
  skills?: Record<string, unknown>
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string, user?: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      setTokens: (accessToken, refreshToken, user) =>
        set((state) => ({ accessToken, refreshToken, user: user ?? state.user })),
    }),
    {
      name: 'spot-admin-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)

/** True once the persisted store has finished reading from localStorage. */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
