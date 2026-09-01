'use client'

export default function Modal({
  title,
  onClose,
  children,
  width = 'max-w-lg',
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <h2 className="text-lg font-semibold text-admin-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-admin-muted hover:bg-admin-surfaceMuted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
