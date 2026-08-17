import { useRouter } from 'expo-router';
import ScheduleScreen from '@/screens/schedule/ScheduleScreen';

export default function ScheduleRoute() {
  const router = useRouter();
  return <ScheduleScreen onBack={() => router.back()} />;
}
