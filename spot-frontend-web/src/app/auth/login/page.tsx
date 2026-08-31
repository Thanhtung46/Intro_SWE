'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AxiosError } from 'axios'
import apiClient from '@/services/api.client'
import { useAuthStore } from '@/state/authStore'

function mapLoginError(err: unknown): string {
  const axiosError = err as AxiosError<{ message?: string; nextStep?: string }>
  const status = axiosError.response?.status
  const message = axiosError.response?.data?.message ?? ''

  if (status === 401) {
    return 'Sai email hoặc mật khẩu.'
  }

  if (status === 403) {
    if (message.includes('select your role')) {
      return 'Tài khoản chưa chọn vai trò. Vui lòng hoàn tất đăng ký trước khi đăng nhập admin.'
    }
    if (message.includes('Too many failed attempts')) {
      return 'Đăng nhập sai quá nhiều lần. Tài khoản đã bị khoá 15 phút.'
    }
    if (message.includes('temporarily locked')) {
      return 'Tài khoản tạm thời bị khoá do đăng nhập sai nhiều lần. Vui lòng thử lại sau.'
    }
    if (message.includes('is locked')) {
      return 'Tài khoản đã bị khoá. Vui lòng liên hệ bộ phận hỗ trợ.'
    }
    if (message.includes('pending approval')) {
      return 'Tài khoản đang chờ duyệt, chưa thể đăng nhập.'
    }
    if (message.includes('not verified')) {
      return 'Email chưa được xác thực. Vui lòng xác thực OTP trước.'
    }
    return message || 'Bạn không có quyền truy cập.'
  }

  if (status === 503) {
    return 'Hệ thống đang gặp sự cố cấu hình. Vui lòng thử lại sau.'
  }

  return 'Đăng nhập thất bại. Vui lòng thử lại.'
}

export default function AdminLoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { data } = await apiClient.post('/auth/login', { email, password })
      const role = data.user?.role

      if (role === 'ADMIN') {
        login(data.accessToken, data.refreshToken, data.user)
        router.push('/admin')
        return
      }

      if (role === 'OWNER') {
        if (data.user?.status === 'ACTIVE') {
          login(data.accessToken, data.refreshToken, data.user)
          router.push('/owner')
          return
        }
        setError('Tài khoản của bạn đang chờ duyệt, vui lòng quay lại sau')
        return
      }

      setError('Tài khoản này không có quyền truy cập khu vực quản trị.')
    } catch (err) {
      setError(mapLoginError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">SPOT Console</h1>
        <p className="mb-6 text-sm text-slate-500">Đăng nhập vào khu vực quản trị / vận hành</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="admin@spot.dev"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </main>
  )
}
