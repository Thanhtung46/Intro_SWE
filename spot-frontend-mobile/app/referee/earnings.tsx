import { RefereeShell } from '@/components/referee/RefereeShell';
import RefereeEarningsScreen from '@/screens/referee/RefereeEarningsScreen';

export default function RefereeEarningsRoute() {
  return (
    <RefereeShell activeTab="earnings">
      <RefereeEarningsScreen />
    </RefereeShell>
  );
}
