import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/state/authStore'

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

const AUTH_ENDPOINTS_WITHOUT_REFRESH = ['/auth/login', '/auth/refresh']

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    const isAuthEndpoint = AUTH_ENDPOINTS_WITHOUT_REFRESH.some((path) =>
      originalRequest?.url?.includes(path)
    )

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      if (!refreshToken) {
        logout()
        if (typeof window !== 'undefined') window.location.href = '/auth/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
          { refreshToken }
        )
        setTokens(data.accessToken, data.refreshToken, data.user)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        logout()
        if (typeof window !== 'undefined') window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
