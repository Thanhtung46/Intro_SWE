import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import ScheduleScreen from '@/screens/schedule/ScheduleScreen';

export default function ScheduleRoute() {
  const { reviewedBookingId } = useLocalSearchParams<{ reviewedBookingId?: string }>();
  return (
    <AppShell>
      <ScheduleScreen justReviewedBookingId={reviewedBookingId} />
    </AppShell>
  );
}
