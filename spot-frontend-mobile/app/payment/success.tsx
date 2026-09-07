import { useLocalSearchParams, useRouter } from 'expo-router';

import PaymentSuccessScreen from '@/screens/checkout/PaymentSuccessScreen';
import { ROUTES } from '@/constants/routes';

// Thin route — parses Checkout's post-payment hand-off params, owns
// navigation (View Details → /booking/[id], Return Home → /home).
export default function PaymentSuccessRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    venueName?: string;
    fieldName?: string;
    address?: string;
    sportType?: string;
    startTime?: string;
    endTime?: string;
    bookingDate?: string;
    totalAmountVnd?: string;
  }>();
  const bookingId = Number(params.id);

  return (
    <PaymentSuccessScreen
      bookingId={bookingId}
      venueName={params.venueName ?? ''}
      fieldName={params.fieldName ?? ''}
      startTime={params.startTime ?? ''}
      endTime={params.endTime ?? ''}
      bookingDate={params.bookingDate ?? ''}
      totalAmountVnd={params.totalAmountVnd ? Number(params.totalAmountVnd) : null}
      onViewDetails={() =>
        router.replace({
          pathname: '/booking/[id]',
          params: {
            id: String(bookingId),
            venueName: params.venueName ?? '',
            fieldName: params.fieldName ?? '',
            address: params.address ?? '',
            sportType: params.sportType ?? '',
            startTime: params.startTime ?? '',
            endTime: params.endTime ?? '',
            bookingDate: params.bookingDate ?? '',
            // Real post-mark-paid status (see spot-backend booking.service.js
            // markBookingPaidDev) — not a guess.
            status: 'PAID',
            totalAmountVnd: params.totalAmountVnd ?? '',
          },
        })
      }
      onReturnHome={() => router.replace(ROUTES.HOME)}
    />
  );
}
