import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../state/authStore'

export function RequireOwnerRole({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuthStore()

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />
  }
  if (user.role !== 'OWNER') {
    return <Navigate to="/login" replace />
  }
  return children
}
