// Currency decision: VNĐ everywhere (SPOT-76 plan mục 2.4) — Figma's
// Homepage/Filter cards mock `$` but that's a design-system placeholder;
// spot-backend only ever works in VND (priceMin/priceMax, no currency field).
export function formatVnd(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${new Intl.NumberFormat('en-US').format(amount)} VND`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatHm(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Day + "19:00 - 21:00" split so Match Detail's narrow Time strip can stack
// them (Tomorrow / 16:00 - 18:00) instead of wrapping mid-range.
export function formatMatchWhenParts(
  startsAtIso: string,
  endsAtIso: string
): { dayLabel: string; timeRange: string } {
  const now = new Date();
  const starts = new Date(startsAtIso);
  const ends = new Date(endsAtIso);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  let dayLabel: string;
  if (isSameCalendarDay(starts, now)) {
    dayLabel = starts.getHours() >= 17 ? 'Tonight' : 'Today';
  } else if (isSameCalendarDay(starts, tomorrow)) {
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = starts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return { dayLabel, timeRange: `${formatHm(starts)} - ${formatHm(ends)}` };
}

// "Tonight, 19:00 - 21:00" / "Tomorrow, 08:00 - 10:00" / "Jul 28, 19:00 - 21:00"
// — matches the Homepage card copy (node 95:2417). Evening cutoff for
// "Tonight" is a judgment call (17:00), not specified in Figma.
export function formatMatchWhen(startsAtIso: string, endsAtIso: string): string {
  const { dayLabel, timeRange } = formatMatchWhenParts(startsAtIso, endsAtIso);
  return `${dayLabel}, ${timeRange}`;
}
