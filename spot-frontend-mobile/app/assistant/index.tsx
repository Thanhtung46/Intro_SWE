import { useRouter } from 'expo-router';
import AssistantScreen from '@/screens/assistant/AssistantScreen';

// "/assistant" — AI assistant chat (spec 004-ai-features-frontend-integration),
// reached from the AI icon in the app's shared top bar.
export default function AssistantRoute() {
  const router = useRouter();
  return <AssistantScreen onBack={() => router.back()} />;
}
