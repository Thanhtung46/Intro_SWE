import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationItem,
} from '../services/notificationService';
import { showAlert } from '@/utils/showAlert';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationKey } from '@/i18n/translations';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

interface NotificationMenuProps {
  visible: boolean;
  onClose: () => void;
}

function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatRelativeTime(iso: string, t: (key: TranslationKey) => string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMin < 1) return t('notifications.justNow');
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (isSameLocalDay(date, now)) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return t('notifications.yesterday');

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function iconForType(
  type: NotificationItem['type'],
  c: ThemeColors
): {
  name: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
} {
  if (type === 'SYSTEM') {
    return { name: 'information-circle', bg: c.systemIconBg, color: c.textSecondary };
  }
  return { name: 'calendar', bg: c.primary, color: c.white };
}

export function NotificationMenu({ visible, onClose }: NotificationMenuProps) {
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
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
      showAlert(t('common.error'), result.message || t('common.genericError'));
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} testID="notification-menu-card">
              <View style={styles.header}>
                <Text style={styles.title}>{t('notifications.title')}</Text>
                <TouchableOpacity testID="notification-mark-all-read" onPress={handleMarkAllRead}>
                  <Text style={styles.markAllRead}>{t('notifications.markAllRead')}</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <Text style={styles.emptyText}>{t('common.loading')}</Text>
              ) : items.length === 0 ? (
                <Text style={styles.emptyText}>{t('notifications.emptyState')}</Text>
              ) : (
                <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator>
                  {items.map((item) => {
                    const icon = iconForType(item.type, themeColors);
                <ScrollView style={styles.list}>
                  {items.map((item) => {
                    const icon = iconForType(item.type);
                    return (
                      <TouchableOpacity
                        key={item.notificationId}
                        testID={`notification-item-${item.notificationId}`}
                        style={[styles.item, !item.isRead && styles.itemUnread]}
                        style={styles.item}
                        onPress={() => handleItemPress(item)}
                      >
                        <View style={[styles.itemIcon, { backgroundColor: icon.bg }]}>
                          <Ionicons name={icon.name} size={18} color={icon.color} />
                        </View>
                        <View style={styles.itemBody}>
                          <Text style={styles.itemTitle}>{item.title}</Text>
                          {item.body ? <Text style={styles.itemText}>{item.body}</Text> : null}
                          <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt, t)}</Text>
                          <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>
                        {!item.isRead ? <View style={styles.unreadDot} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
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
      backgroundColor: c.menuSurface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
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
      borderBottomWidth: 1,
      borderBottomColor: c.menuHeaderBorder,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    markAllRead: {
      fontSize: 13,
      fontWeight: '600',
      color: c.primary,
    },
    emptyText: {
      paddingHorizontal: 16,
      paddingVertical: 20,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
    },
    itemsScroll: {
      maxHeight: 370,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
    },
    itemUnread: {
      backgroundColor: c.unreadItemTint,
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
      color: c.textPrimary,
    },
    itemText: {
      fontSize: 13,
      color: c.textSecondaryAlt,
      marginTop: 2,
    },
    itemTime: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.primary,
      marginTop: 4,
    },
  });
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
