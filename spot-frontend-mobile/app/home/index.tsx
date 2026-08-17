<<<<<<< HEAD:spot-frontend-mobile/app/home/index.tsx
import React, { useState } from 'react';
import { ProfileMenu } from '@/components/ProfileMenu';
import { useUser } from '@/context/UserContext';
import HomeScreen from '@/screens/home/HomeScreen';
=======
import { useRouter } from 'expo-router';
import React from 'react';
import { AppShell } from '../src/components/AppShell';
import HomeScreen from '../src/screens/home/HomeScreen';
>>>>>>> refs/remotes/origin/SPOT-34-Football-Dashboard-Trang-chủ-Player-Football-tab:spot-frontend-mobile/app/home.tsx

// Home dashboard (Figma node 8:2, "Football Dashboard") — header/bottom
// nav/ProfileMenu/NotificationMenu now live in AppShell (shared with
// Schedule/Settings), this route just wires HomeScreen's content in.
export default function Home() {
  const router = useRouter();
  return (
    <AppShell activeTab="home">
      <HomeScreen onNavigateSchedule={() => router.push('/schedule')} />
    </AppShell>
  );
}
