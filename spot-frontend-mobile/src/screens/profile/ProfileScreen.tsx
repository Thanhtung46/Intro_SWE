import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../../context/UserContext';
import { colors } from '../../theme/colors';

const FAVORITE_TABS = ['Matches', 'Venues', 'Groups', 'Tournaments'];
const HOSTED_MATCH_TABS = ['Open', 'Ended', 'All'];

function CardHeader({
  icon,
  iconBg,
  title,
  onPress,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconBadge, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.subtitle} /> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity testID={`profile-card-header-${title}`} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

function EmptyState({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ onBack, onEdit }: { onBack: () => void; onEdit: () => void }) {
  const { user } = useUser();
  const [favoriteTab, setFavoriteTab] = useState(FAVORITE_TABS[0]);
  const [hostedTab, setHostedTab] = useState(HOSTED_MATCH_TABS[0]);

  const showComingSoon = (feature: string) => {
    Alert.alert('Coming soon', `${feature} is not available yet.`);
  };

  const displayName = user?.fullName || 'Guest';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity testID="profile-back-button" style={styles.heroIconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity testID="profile-edit-button" style={styles.editButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={16} color={colors.white} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.identitySection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text testID="profile-name" style={styles.name}>
            {displayName}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Hosted Matches</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
        </View>

        <View style={styles.sections}>
          <View>
            <CardHeader
              icon={<Ionicons name="people" size={20} color={colors.primary} />}
              iconBg={colors.primarySoft}
              title="Groups"
              onPress={() => showComingSoon('Groups')}
            />
            <View style={styles.groupRows}>
              <View style={styles.groupRow}>
                <Text style={styles.groupRowLabel}>Managing</Text>
                <Text style={styles.groupRowValue}>0</Text>
              </View>
              <View style={styles.groupRow}>
                <Text style={styles.groupRowLabel}>Joined</Text>
                <Text style={styles.groupRowValue}>0</Text>
              </View>
            </View>
          </View>

          <View>
            <CardHeader
              icon={<Ionicons name="heart" size={18} color={colors.pink} />}
              iconBg={colors.pinkSoft}
              title="Favorites"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {FAVORITE_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  testID={`favorites-tab-${tab}`}
                  style={[styles.chip, favoriteTab === tab && styles.chipActive]}
                  onPress={() => setFavoriteTab(tab)}
                >
                  <Text style={[styles.chipText, favoriteTab === tab && styles.chipTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <EmptyState
              icon={<Ionicons name="heart-outline" size={28} color={colors.placeholder} />}
              label="No favorite matches yet"
            />
          </View>

          <View>
            <CardHeader
              icon={<MaterialCommunityIcons name="stadium-variant" size={20} color={colors.orange} />}
              iconBg={colors.orangeSoft}
              title="Hosted Matches"
            />
            <View style={styles.tabsRow}>
              {HOSTED_MATCH_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  testID={`hosted-tab-${tab}`}
                  style={[styles.tabPill, hostedTab === tab && styles.tabPillActive]}
                  onPress={() => setHostedTab(tab)}
                >
                  <Text style={[styles.tabPillText, hostedTab === tab && styles.tabPillTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <EmptyState
              icon={<MaterialCommunityIcons name="calendar-remove-outline" size={30} color={colors.placeholder} />}
              label="No active matches"
            />
          </View>

          <View>
            <CardHeader
              icon={<Ionicons name="star" size={18} color={colors.amber} />}
              iconBg={colors.amberSoft}
              title="Reviews"
              onPress={() => showComingSoon('Reviews')}
            />
            <EmptyState
              icon={
                <View style={styles.starsRow}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Ionicons key={i} name="star-outline" size={20} color={colors.placeholder} />
                  ))}
                </View>
              }
              label="No reviews yet"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    height: 160,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  editButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  identitySection: {
    alignItems: 'center',
    marginTop: -64,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primarySoft,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 40,
  },
  name: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.subtitle,
  },
  sections: {
    marginTop: 8,
    marginHorizontal: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  groupRows: {
    marginTop: 16,
    gap: 12,
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupRowLabel: {
    fontSize: 14,
    color: colors.text,
  },
  groupRowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.subtitle,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  tabPillActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabPillText: {
    fontSize: 13,
    color: colors.subtitle,
  },
  tabPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.subtitle,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
});
