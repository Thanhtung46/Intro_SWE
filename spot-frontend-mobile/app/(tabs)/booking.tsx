import React, { useEffect, useState } from 'react';
import { NotificationMenu } from '@/components/NotificationMenu';
import { ProfileMenu } from '@/components/ProfileMenu';
import { useUser } from '@/context/UserContext';
import { getUnreadCount } from '@/services/notificationService';
import BookingScreen from '@/screens/booking/BookingScreen';

// Booking Field venue list (Figma node 79:1390, "Booking Field - Home page")
// — reached from the Home dashboard's "Book Field" quick action.
export default function Booking() {
  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationMenuVisible, setNotificationMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = () => {
    getUnreadCount().then((result) => {
      setUnreadCount(result.count ?? 0);
    });
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  return (
    <>
      <BookingScreen
        onAvatarPress={() => setMenuVisible(true)}
        avatarInitial={(user?.fullName || 'G').charAt(0).toUpperCase()}
        onNotificationsPress={() => setNotificationMenuVisible(true)}
        unreadCount={unreadCount}
      />
      <ProfileMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <NotificationMenu
        visible={notificationMenuVisible}
        onClose={() => {
          setNotificationMenuVisible(false);
          refreshUnreadCount();
        }}
      />
    </>
  );
}
