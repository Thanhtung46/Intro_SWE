interface KpiCardProps {
  label: string
  value: string
  hint?: string
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="owner-card">
      <p className="owner-kpi-card__label">{label}</p>
      <p className="owner-kpi-card__value">{value}</p>
      {hint && <p className="owner-kpi-card__hint">{hint}</p>}
    </div>
  )
}
