import { useRouter } from 'expo-router';
import ScheduleScreen from '@/screens/schedule/ScheduleScreen';

export default function ScheduleRoute() {
  return (
    <AppShell activeTab="schedule">
      <ScheduleScreen />
    </AppShell>
  );
}
