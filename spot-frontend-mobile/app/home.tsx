import { useLocalSearchParams } from 'expo-router';
import HomeScreen from '../src/screens/home/HomeScreen';

export default function HomeRoute() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = typeof roleParam === 'string' && roleParam ? roleParam : 'user';
  return <HomeScreen role={role} />;
}
