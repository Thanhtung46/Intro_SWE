import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import LoginScreen from '@/screens/auth/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();
  return (
    <LoginScreen
      onLoggedIn={(role) => {
        // A referee can only reach a successful login once an admin has
        // activated them (spot-backend blocks PENDING login), so this is
        // always the post-approval landing — show the celebratory screen.
        if (role === 'REFEREE') {
          router.replace(ROUTES.REFEREE_ACTIVATED);
          return;
        }
        router.replace({ pathname: ROUTES.HOME, params: { role } });
      }}
    />
  );
}
