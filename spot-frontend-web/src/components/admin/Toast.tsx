'use client'

export interface ToastState {
  type: 'success' | 'error'
  message: string
}

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg"
      style={{
        backgroundColor: toast.type === 'success' ? '#d1fae5' : '#ffdad6',
        borderColor: toast.type === 'success' ? '#047857' : '#ba1a1a',
      }}
    >
      <p className="flex-1 text-sm font-medium text-admin-ink">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-admin-muted hover:text-admin-ink"
        aria-label="Đóng thông báo"
      >
        ✕
      </button>
    </div>
  )
}
