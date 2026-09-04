import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import BookingDetailScreen from '@/screens/booking/BookingDetailScreen';
import { openVenueDirections } from '@/utils/directions';

// Thin route — parses Schedule's "Match Details" (BOOKING branch) params,
// owns navigation. See ScheduleScreen.tsx's openEventDetails for the caller.
export default function BookingDetailRoute() {
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
    status?: string;
    totalAmountVnd?: string;
    alreadyReviewed?: string;
  }>();
  const bookingId = Number(params.id);

  // Reported back to Schedule via router params (that screen stays mounted
  // in the stack, so a plain `back()` wouldn't refresh its own reviewed set).
  const [justReviewed, setJustReviewed] = useState(false);

  const handleBack = () => {
    if (justReviewed) {
      router.navigate({ pathname: '/schedule', params: { reviewedBookingId: String(bookingId) } });
      return;
    }
    router.back();
  };

  return (
    <BookingDetailScreen
      bookingId={bookingId}
      venueName={params.venueName ?? ''}
      fieldName={params.fieldName ?? ''}
      address={params.address ?? ''}
      sportType={params.sportType ?? ''}
      startTime={params.startTime ?? ''}
      endTime={params.endTime ?? ''}
      bookingDate={params.bookingDate ?? ''}
      status={params.status ?? ''}
      totalAmountVnd={params.totalAmountVnd ? Number(params.totalAmountVnd) : null}
      alreadyReviewed={params.alreadyReviewed === '1'}
      onBack={handleBack}
      onOpenDirections={() =>
        openVenueDirections(router, {
          latitude: null,
          longitude: null,
          venueName: params.venueName ?? '',
          venueAddress: params.address ?? '',
        })
      }
      onReviewSubmitted={() => setJustReviewed(true)}
    />
  );
}
