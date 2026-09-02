import { useRouter } from 'expo-router';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import { ROUTES } from '@/constants/routes';

export default function RegisterRoute() {
  const router = useRouter();
  return (
    <RegisterScreen
      onBack={() => router.back()}
      // Backend flow is register → select role → verify OTP (the OTP verify
      // only issues a pending Owner/Referee token once the role is set), so
      // step 2 is always choose-role, never OTP directly.
      onRegistered={(email) => router.push({ pathname: ROUTES.AUTH_CHOOSE_ROLE, params: { email } })}
    />
  );
}
