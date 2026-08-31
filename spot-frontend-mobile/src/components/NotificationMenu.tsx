import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem,
} from '../services/notificationService';
import { colors } from '@/constants/colors';
import { showAlert } from '@/utils/showAlert';

interface NotificationMenuProps {
  visible: boolean;
  onClose: () => void;
}

function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (isSameLocalDay(date, now)) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function iconForType(type: NotificationItem['type']): {
  name: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
} {
  if (type === 'SYSTEM') {
    return { name: 'information-circle', bg: colors.border, color: colors.subtitle };
  }
  return { name: 'calendar', bg: colors.primaryDark, color: colors.white };
}

export function NotificationMenu({ visible, onClose }: NotificationMenuProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getNotifications(20).then((result) => {
      setLoading(false);
      if (result.success) {
        setItems(result.items ?? []);
      }
    });
  }, [visible]);

  const handleMarkAllRead = async () => {
    const previous = items;
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    const result = await markAllNotificationsRead();
    if (!result.success) {
      setItems(previous);
      showAlert('Error', result.message || 'Something went wrong. Please try again.');
    }
  };

  const handleItemPress = async (item: NotificationItem) => {
    if (item.isRead) return;
    setItems((prev) =>
      prev.map((n) => (n.notificationId === item.notificationId ? { ...n, isRead: true } : n))
    );
    const result = await markNotificationRead(item.notificationId);
    if (!result.success) {
      setItems((prev) =>
        prev.map((n) => (n.notificationId === item.notificationId ? { ...n, isRead: false } : n))
      );
    }
  };

  const handleViewAll = () => {
    showAlert('Coming soon', 'A full notifications screen is not available yet.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} testID="notification-menu-card">
              <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
                <TouchableOpacity testID="notification-mark-all-read" onPress={handleMarkAllRead}>
                  <Text style={styles.markAllRead}>Mark all read</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <Text style={styles.emptyText}>Loading...</Text>
              ) : items.length === 0 ? (
                <Text style={styles.emptyText}>No notifications yet</Text>
              ) : (
                <ScrollView style={styles.list}>
                  {items.map((item) => {
                    const icon = iconForType(item.type);
                    return (
                      <TouchableOpacity
                        key={item.notificationId}
                        testID={`notification-item-${item.notificationId}`}
                        style={styles.item}
                        onPress={() => handleItemPress(item)}
                      >
                        <View style={[styles.itemIcon, { backgroundColor: icon.bg }]}>
                          <Ionicons name={icon.name} size={18} color={icon.color} />
                        </View>
                        <View style={styles.itemBody}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          {item.body ? <Text style={styles.itemText}>{item.body}</Text> : null}
                          <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>
                        {!item.isRead ? <View style={styles.unreadDot} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <TouchableOpacity testID="notification-view-all" style={styles.viewAllButton} onPress={handleViewAll}>
                <Text style={styles.viewAllText}>View All Notifications</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  card: {
    position: 'absolute',
    top: 64,
    right: 16,
    width: 300,
    maxHeight: 420,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  markAllRead: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  list: {
    flexShrink: 1,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 13,
    color: colors.subtitle,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  itemText: {
    fontSize: 13,
    color: colors.subtitle,
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
    marginTop: 4,
  },
  viewAllButton: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});
