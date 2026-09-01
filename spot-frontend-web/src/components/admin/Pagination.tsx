'use client'

export default function Pagination({
  total,
  limit,
  offset,
  itemLabel,
  onOffsetChange,
}: {
  total: number
  limit: number
  offset: number
  itemLabel: string
  onOffsetChange: (offset: number) => void
}) {
  if (total === 0) return null

  const from = offset + 1
  const to = Math.min(offset + limit, total)
  const canPrev = offset > 0
  const canNext = to < total

  return (
    <div className="flex items-center justify-between border-t border-admin-border px-4 py-3">
      <p className="text-sm text-admin-muted">
        Hiển thị {from}–{to} / {total} {itemLabel}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          className="rounded-md border border-admin-border px-3 py-1.5 text-sm font-medium text-admin-ink disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-admin-surfaceMuted"
        >
          Trước
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onOffsetChange(offset + limit)}
          className="rounded-md border border-admin-border px-3 py-1.5 text-sm font-medium text-admin-ink disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-admin-surfaceMuted"
        >
          Sau
        </button>
      </div>
    </div>
  )
}
