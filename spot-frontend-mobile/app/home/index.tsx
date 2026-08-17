import React, { useState } from 'react';
import { ProfileMenu } from '@/components/ProfileMenu';
import { useUser } from '@/context/UserContext';
import HomeScreen from '@/screens/home/HomeScreen';

// Home dashboard (Figma node 8:2, "Football Dashboard") — replaces the
// earlier role-placeholder screen now that a real design exists.
export default function Home() {
  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <HomeScreen
        onAvatarPress={() => setMenuVisible(true)}
        avatarInitial={(user?.fullName || 'G').charAt(0).toUpperCase()}
      />
      <ProfileMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}
