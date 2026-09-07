import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import CheckoutScreen from '@/screens/checkout/CheckoutScreen';
import { getCheckoutDraft } from '@/services/checkoutDraft';

export default function CheckoutRoute() {
  const router = useRouter();
  const draft = getCheckoutDraft();

  useEffect(() => {
    // No draft (e.g. opening the URL directly, or a web page reload while
    // sitting on this route — the draft only lives in memory) — nothing to
    // pay for, so back out instead of crashing.
    if (!draft) {
      if (router.canGoBack()) router.back();
      else router.replace('/booking');
    }
  }, [draft]);

  if (!draft) return null;

  return <CheckoutScreen items={draft.items} dateLabel={draft.dateLabel} onBack={() => router.back()} />;
}
