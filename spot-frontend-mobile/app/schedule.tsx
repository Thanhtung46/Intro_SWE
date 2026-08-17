import { AppShell } from '../src/components/AppShell';
import ScheduleScreen from '../src/screens/schedule/ScheduleScreen';

export default function ScheduleRoute() {
  return (
    <AppShell activeTab="schedule">
      <ScheduleScreen />
    </AppShell>
  );
}
