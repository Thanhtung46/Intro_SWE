import axios from 'axios'
import { useAuthStore } from '../state/authStore'

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export const apiClient = axios.create({ baseURL })

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)
