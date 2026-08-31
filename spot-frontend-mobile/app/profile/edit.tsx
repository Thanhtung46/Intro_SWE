import { useRouter } from 'expo-router';
import EditProfileScreen from '@/screens/profile/EditProfileScreen';
import { ROUTES } from '@/constants/routes';

export default function EditProfileRoute() {
  const router = useRouter();
  return (
    <EditProfileScreen
      onBack={() => router.back()}
      onChangePasswordOtpSent={(email) =>
        router.push({ pathname: ROUTES.AUTH_FORGOT_PASSWORD_OTP, params: { email } })
      }
    />
  );
}
