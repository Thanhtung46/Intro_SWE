import type { PaymentLineItem } from '@/screens/checkout/CheckoutScreen';

// Module-level in-memory store — no persistence, no AsyncStorage. Only
// needs to survive the hop from SelectPitchTimeModal's handleConfirm to
// app/checkout.tsx, both within the same JS session, so this is enough.
let draft: { items: PaymentLineItem[]; dateLabel: string } | null = null;

export function setCheckoutDraft(items: PaymentLineItem[], dateLabel: string) {
  draft = { items, dateLabel };
}

export function getCheckoutDraft(): { items: PaymentLineItem[]; dateLabel: string } | null {
  return draft;
}

export function clearCheckoutDraft() {
  draft = null;
}
