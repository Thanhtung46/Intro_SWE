import { useRouter } from 'expo-router';

import OwnerWelcome from '../src/screens/owner/OwnerWelcome';

/**
 * "/owner-welcome" — shown right after a new user picks the Venue Owner
 * role (Figma node 1:634, ticket SPOT-58).
 *
 * TODO: once the venue registration form and the Owner check-in app exist,
 * route "Enter App" there instead of the '/home' placeholder (same pattern
 * as the onboarding routes' TODOs). Also TODO: an edge-case "pending
 * approval" message once `spot-backend`'s register-owner endpoint exists
 * to report application status from.
 */
export default function OwnerWelcomeScreen() {
  const router = useRouter();

  const handleEnterApp = () => {
    router.replace('/home');
  };

  const handleLater = () => {
    router.replace('/home');
  };

  return <OwnerWelcome onEnterApp={handleEnterApp} onLater={handleLater} />;
}
