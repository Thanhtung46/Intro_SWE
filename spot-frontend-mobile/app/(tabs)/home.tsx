import { useRouter } from 'expo-router';
import React from 'react';
import { AppShell } from '@/components/AppShell';
import HomeScreen from '@/screens/home/HomeScreen';
import { ROUTES } from '@/constants/routes';

// Home dashboard (Figma node 8:2, "Football Dashboard") — header/bottom
// nav/ProfileMenu/NotificationMenu now live in AppShell (shared with
// Schedule/Settings), this route just wires HomeScreen's content in.
export default function Home() {
  const router = useRouter();
  return (
    <AppShell>
      <HomeScreen onNavigateSchedule={() => router.push(ROUTES.SCHEDULE)} />
    </AppShell>
  );
}
