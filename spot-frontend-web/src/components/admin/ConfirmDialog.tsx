'use client'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  isSubmitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-admin-ink">{title}</h2>
        <p className="mt-2 text-sm text-admin-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border border-admin-border px-4 py-2 text-sm font-medium text-admin-ink hover:bg-admin-surfaceMuted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              danger ? 'bg-admin-danger hover:bg-red-800' : 'bg-admin-primary hover:bg-admin-primaryHover'
            }`}
          >
            {isSubmitting ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
