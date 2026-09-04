import { useCallback, useRef, useState } from 'react'
import type { ToastState } from '@/components/admin/Toast'

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((type: ToastState['type'], message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ type, message })
    timerRef.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const closeToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  return { toast, showToast, closeToast }
}
