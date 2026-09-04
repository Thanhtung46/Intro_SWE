const VARIANT_CLASSES = {
  neutral: 'bg-admin-surfaceMuted text-admin-muted',
  success: 'bg-admin-successBg text-admin-success',
  warning: 'bg-admin-warningBg text-admin-warning',
  danger: 'bg-admin-dangerBg text-admin-danger',
  info: 'bg-admin-infoBg text-admin-info',
  purple: 'bg-admin-purpleBg text-admin-purple',
} as const

export type BadgeVariant = keyof typeof VARIANT_CLASSES

export default function Badge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode
  variant?: BadgeVariant
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  )
}

export function roleBadgeVariant(role: string): BadgeVariant {
  if (role === 'OWNER') return 'purple'
  if (role === 'REFEREE') return 'warning'
  if (role === 'ADMIN') return 'info'
  return 'neutral'
}

export function statusBadgeVariant(status: string): BadgeVariant {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PENDING') return 'warning'
  if (status === 'LOCKED') return 'danger'
  return 'neutral'
}
