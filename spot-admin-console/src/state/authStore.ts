import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  userId: string
  email: string
  fullName: string
  role: string
  status: string
  avatarUrl?: string | null
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  login: (accessToken: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      login: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'spot-admin-auth' },
  ),
)
