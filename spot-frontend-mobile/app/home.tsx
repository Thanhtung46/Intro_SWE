import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ProfileMenu } from '../src/components/ProfileMenu';
import { useUser } from '../src/context/UserContext';
import HomeScreen from '../src/screens/home/HomeScreen';

// Home dashboard (Figma node 8:2, "Football Dashboard") — replaces the
// earlier role-placeholder screen now that a real design exists.
export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <HomeScreen
        onAvatarPress={() => setMenuVisible(true)}
        avatarInitial={(user?.fullName || 'G').charAt(0).toUpperCase()}
        onNavigateSchedule={() => router.push('/schedule')}
        onNavigateSettings={() => router.push('/settings')}
      />
      <ProfileMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}
