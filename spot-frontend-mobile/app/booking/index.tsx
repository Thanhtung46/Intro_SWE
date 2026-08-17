import React, { useState } from 'react';
import { ProfileMenu } from '@/components/ProfileMenu';
import { useUser } from '@/context/UserContext';
import BookingScreen from '@/screens/booking/BookingScreen';

// Booking Field venue list (Figma node 79:1390, "Booking Field - Home page")
// — reached from the Home dashboard's "Book Field" quick action.
export default function Booking() {
  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <BookingScreen
        onAvatarPress={() => setMenuVisible(true)}
        avatarInitial={(user?.fullName || 'G').charAt(0).toUpperCase()}
      />
      <ProfileMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}
