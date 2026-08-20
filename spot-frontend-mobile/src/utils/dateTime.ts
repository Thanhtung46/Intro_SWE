// Shared date/HH:mm <-> Date helpers for screens using
// @react-native-community/datetimepicker against spot-backend's
// YYYY-MM-DD / HH:mm string formats (FilterSheet.tsx, HostMatchScreen.tsx).

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toHm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function parseHm(hm: string): Date {
  const [h, min] = hm.split(':').map(Number);
  const d = new Date();
  if (Number.isFinite(h) && Number.isFinite(min)) {
    d.setHours(h, min, 0, 0);
  }
  return d;
}

// "28/7/2026" — matches Figma's formatted date display (FilterSheet node
// 87:1903, Host form node 99:2).
export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}
