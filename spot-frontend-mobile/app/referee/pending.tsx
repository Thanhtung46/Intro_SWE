import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { useUser } from '@/context/UserContext';
import RefereePendingScreen from '@/screens/referee/RefereePendingScreen';
import { clearAllTokens } from '@/utils/authStorage';

/** "/referee/pending" — "Application Under Review". A referee cannot log in
 *  until an admin approves. If they never finished the document upload,
 *  "Submit Documents" routes them back to it (the token is already stored). */
export default function RefereePendingRoute() {
  const router = useRouter();
  const { clearUser } = useUser();

  const handleLogout = async () => {
    await clearAllTokens();
    clearUser();
    router.replace(ROUTES.AUTH_LOGIN);
  };

  return (
    <RefereePendingScreen
      onLogout={handleLogout}
      onSubmitDocuments={() => router.replace(ROUTES.REFEREE_REGISTER)}
    />
  );
}
