import { formatVnd } from '../../utils/format'
import type { RevenuePoint } from '../../types/owner'

/**
 * Payouts aren't a real ledger yet (see research.md R4) — the most recent
 * weekly revenue point is presented as the upcoming scheduled payout, and
 * earlier points as already-paid history.
 */
function derivePayouts(points: RevenuePoint[]) {
  const sorted = [...points].sort((a, b) => a.periodStart.localeCompare(b.periodStart))
  const scheduled = sorted[sorted.length - 1] ?? null
  const history = sorted.slice(0, -1).reverse()
  return { scheduled, history }
}

function nextPayoutDate(periodStart: string): string {
  const d = new Date(periodStart)
  d.setDate(d.getDate() + 7)
  return d.toLocaleDateString('vi-VN')
}

export function PayoutCard({ points }: { points: RevenuePoint[] }) {
  const { scheduled } = derivePayouts(points)
  return (
    <div className="owner-card">
      <p className="owner-kpi-card__label">Scheduled payout</p>
      {scheduled ? (
        <>
          <p className="owner-kpi-card__value">{formatVnd(scheduled.revenue)}</p>
          <p className="owner-kpi-card__hint">On {nextPayoutDate(scheduled.periodStart)}</p>
        </>
      ) : (
        <p className="owner-kpi-card__hint">No revenue yet this period.</p>
      )}
    </div>
  )
}

export function PayoutHistoryTable({ points }: { points: RevenuePoint[] }) {
  const { history } = derivePayouts(points)
  if (history.length === 0) {
    return (
      <div className="owner-card">
        <p className="owner-kpi-card__label">Payout history</p>
        <p className="owner-kpi-card__hint">No past payouts yet.</p>
      </div>
    )
  }
  return (
    <div className="owner-card">
      <p className="owner-kpi-card__label" style={{ marginBottom: 12 }}>
        Payout history
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#64748b' }}>
            <th style={{ paddingBottom: 8 }}>Period</th>
            <th style={{ paddingBottom: 8 }}>Amount</th>
            <th style={{ paddingBottom: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((point) => (
            <tr key={point.periodStart} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 0' }}>{new Date(point.periodStart).toLocaleDateString('vi-VN')}</td>
              <td style={{ padding: '8px 0' }}>{formatVnd(point.revenue)}</td>
              <td style={{ padding: '8px 0', color: '#15803d' }}>Paid</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
