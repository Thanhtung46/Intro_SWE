import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { ROUTES } from '@/constants/routes';
import { useUser } from '@/context/UserContext';
import { clearAllTokens } from '@/utils/authStorage';
import { onSessionExpired } from '@/utils/sessionEvents';

/** Redirects to login when apiClient cannot refresh an expired access token. */
export function SessionExpiredHandler() {
  const router = useRouter();
  const { clearUser } = useUser();

  useEffect(() => {
    return onSessionExpired(() => {
      void (async () => {
        await clearAllTokens();
        clearUser();
        Alert.alert('Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => router.replace(ROUTES.AUTH_LOGIN) },
        ]);
      })();
    });
  }, [router, clearUser]);

  return null;
}
