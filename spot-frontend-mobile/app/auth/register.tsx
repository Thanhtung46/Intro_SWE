import { useRouter } from 'expo-router';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import { ROUTES } from '@/constants/routes';

export default function RegisterRoute() {
  const router = useRouter();
  return (
    <RegisterScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
      }}
      // Backend flow is register → verify OTP → select role. OTP verify only
      // needs the email, and POST /auth/role issues the pending Owner/Referee
      // token afterwards, so step 2 is always OTP, never choose-role directly.
      onRegistered={(email) => router.push({ pathname: ROUTES.AUTH_OTP, params: { email } })}
    />
  );
}
