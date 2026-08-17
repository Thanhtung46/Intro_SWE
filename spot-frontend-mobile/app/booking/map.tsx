import React from 'react';
import { useRouter } from 'expo-router';
import BookingMapScreen from '@/screens/booking/BookingMapScreen';
import { ROUTES } from '@/constants/routes';

// Booking Field venue map (Figma node 79:1286, "Book field - Map") — reached
// from the map-view button on the Booking Field list screen (app/booking/index.tsx).
export default function BookingMap() {
  const router = useRouter();

  return <BookingMapScreen onSwitchToList={() => router.replace(ROUTES.BOOKING)} />;
}
