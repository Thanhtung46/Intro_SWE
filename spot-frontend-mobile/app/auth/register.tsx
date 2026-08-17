import { useRouter } from 'expo-router';
import RegisterScreen from '../../src/screens/auth/RegisterScreen';

export default function RegisterRoute() {
  const router = useRouter();
  return (
    <RegisterScreen
      onBack={() => router.back()}
      onRegistered={(email) => router.push({ pathname: '/auth/choose-role', params: { email } })}
    />
  );
}
