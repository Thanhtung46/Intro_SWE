import { AppShell } from '@/components/AppShell';
import ScheduleScreen from '@/screens/schedule/ScheduleScreen';

export default function ScheduleRoute() {
  return (
    <AppShell activeTab="schedule">
      <ScheduleScreen />
    </AppShell>
  );
}
