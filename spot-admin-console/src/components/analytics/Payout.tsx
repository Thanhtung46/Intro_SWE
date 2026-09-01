import { formatVnd } from '../../utils/format'
import type { RevenuePoint } from '../../types/owner'

/**
 * Payouts aren't a real ledger yet (see research.md R4) — the most recent
 * weekly revenue point is presented as the upcoming scheduled payout, and
 * earlier points as already-paid history.
 */
function derivePayouts(points: RevenuePoint[]) {
  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period))
  const scheduled = sorted[sorted.length - 1] ?? null
  const history = sorted.slice(0, -1).reverse()
  return { scheduled, history }
}

function nextPayoutDate(period: string): string {
  const d = new Date(period)
  d.setDate(d.getDate() + 7)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PayoutCard({ points }: { points: RevenuePoint[] }) {
  const { scheduled } = derivePayouts(points)
  return (
    <div className="owner-payout-card">
      <p className="owner-payout-card__label">Scheduled Payout</p>
      {scheduled ? (
        <div className="owner-payout-card__row">
          <span className="owner-payout-card__amount">{formatVnd(scheduled.revenue)}</span>
          <span className="owner-payout-card__date">{nextPayoutDate(scheduled.period)}</span>
        </div>
      ) : (
        <p style={{ color: 'var(--owner-text-muted)', fontSize: 13 }}>No revenue yet this period.</p>
      )}
    </div>
  )
}

export function PayoutHistoryTable({ points }: { points: RevenuePoint[] }) {
  const { history } = derivePayouts(points)
  return (
    <div className="owner-card">
      <h2 className="owner-section-title" style={{ marginBottom: 16, fontSize: 20 }}>
        Recent Payouts
      </h2>
      {history.length === 0 ? (
        <p style={{ color: 'var(--owner-text-muted)', fontSize: 13 }}>No past payouts yet.</p>
      ) : (
        <table className="owner-payout-history-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((point) => (
              <tr key={point.period}>
                <td>{new Date(point.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                <td>{formatVnd(point.revenue)}</td>
                <td className="owner-status-paid">Paid</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
