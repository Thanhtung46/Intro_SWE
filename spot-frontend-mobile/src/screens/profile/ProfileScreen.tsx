import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { comingSoon } from '@/utils/comingSoon';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { TranslationKey } from '@/i18n/translations';
import BottomNav from '@/components/navigation/BottomNav';
import { getMainProfile, MainProfileStats } from '@/services/profileService';

function formatJoinedAt(joinedAt: string | null | undefined): string {
  if (!joinedAt) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(joinedAt));
  } catch (error) {
    return '—';
  }
}

const FAVORITE_TABS = ['Matches', 'Venues', 'Groups', 'Tournaments'];
const HOSTED_MATCH_TABS = ['Open', 'Ended', 'All'];

// Tab identifiers stay in English (used as state/testID keys) — only the
// displayed label is translated, so the active tab still matches correctly
// after a language switch mid-session.
function getFavoriteTabLabel(tab: string, t: (key: TranslationKey) => string): string {
  switch (tab) {
    case 'Matches':
      return t('profile.favMatches');
    case 'Venues':
      return t('profile.favVenues');
    case 'Groups':
      return t('profile.favGroups');
    case 'Tournaments':
      return t('profile.favTournaments');
    default:
      return tab;
  }
}

function getHostedTabLabel(tab: string, t: (key: TranslationKey) => string): string {
  switch (tab) {
    case 'Open':
      return t('profile.hostedOpen');
    case 'Ended':
      return t('profile.hostedEnded');
    case 'All':
      return t('profile.hostedAll');
    default:
      return tab;
  }
}

function CardHeader({
  icon,
  iconBg,
  title,
  onPress,
  styles,
  chevronColor,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  onPress?: () => void;
  styles: ReturnType<typeof getStyles>;
  chevronColor: string;
}) {
  const content = (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconBadge, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={chevronColor} /> : null}
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

function EmptyState({
  icon,
  label,
  styles,
}: {
  icon: ReactNode;
  label: string;
  styles: ReturnType<typeof getStyles>;
}) {
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ onBack, onEdit }: { onBack: () => void; onEdit: () => void }) {
  const { user } = useUser();
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [favoriteTab, setFavoriteTab] = useState(FAVORITE_TABS[0]);
  const [hostedTab, setHostedTab] = useState(HOSTED_MATCH_TABS[0]);
  const [stats, setStats] = useState<MainProfileStats | undefined>(undefined);

  useEffect(() => {
    getMainProfile().then((result) => {
      if (result.success) {
        setStats(result.stats);
      }
    });
  }, []);

  const displayName = user?.fullName || t('common.guestFallback');

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity testID="profile-back-button" style={styles.heroIconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={c.white} />
          </TouchableOpacity>
          <TouchableOpacity testID="profile-edit-button" style={styles.editButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={16} color={c.white} />
            <Text style={styles.editButtonText}>{t('profile.editButton')}</Text>
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
            <Text style={styles.statValue}>{stats?.hostedMatches ?? 0}</Text>
            <Text style={styles.statLabel}>{t('profile.statHostedMatches')}</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={styles.statValue}>{stats?.reviewsCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t('profile.statReviews')}</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={styles.statValue}>{formatJoinedAt(stats?.joinedAt)}</Text>
            <Text style={styles.statLabel}>{t('profile.statJoined')}</Text>
          </View>
        </View>

        <View style={styles.sections}>
          <View>
            <CardHeader
              icon={<Ionicons name="people" size={20} color={c.primary} />}
              iconBg={c.avatarCircleBg}
              title={t('profile.sectionGroups')}
              onPress={() => comingSoon(t('profile.sectionGroups'))}
              styles={styles}
              chevronColor={c.textSecondary}
            />
            <View style={styles.groupRows}>
              <View style={styles.groupRow}>
                <Text style={styles.groupRowLabel}>{t('profile.groupManaging')}</Text>
                <Text style={styles.groupRowValue}>0</Text>
              </View>
              <View style={styles.groupRow}>
                <Text style={styles.groupRowLabel}>{t('profile.groupJoined')}</Text>
                <Text style={styles.groupRowValue}>0</Text>
              </View>
            </View>
          </View>

          <View>
            <CardHeader
              icon={<Ionicons name="heart" size={18} color={c.profileFavoritesIconColor} />}
              iconBg={c.profileFavoritesIconBg}
              title={t('profile.sectionFavorites')}
              styles={styles}
              chevronColor={c.textSecondary}
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
                  <Text style={[styles.chipText, favoriteTab === tab && styles.chipTextActive]}>
                    {getFavoriteTabLabel(tab, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <EmptyState
              icon={<Ionicons name="heart-outline" size={28} color={c.textMuted} />}
              label={t('profile.favoritesEmpty')}
              styles={styles}
            />
          </View>

          <View>
            <CardHeader
              icon={<MaterialCommunityIcons name="stadium-variant" size={20} color={c.profileHostedIconColor} />}
              iconBg={c.profileHostedIconBg}
              title={t('profile.sectionHostedMatches')}
              styles={styles}
              chevronColor={c.textSecondary}
            />
            <View style={styles.tabsRow}>
              {HOSTED_MATCH_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  testID={`hosted-tab-${tab}`}
                  style={[styles.tabPill, hostedTab === tab && styles.tabPillActive]}
                  onPress={() => setHostedTab(tab)}
                >
                  <Text style={[styles.tabPillText, hostedTab === tab && styles.tabPillTextActive]}>
                    {getHostedTabLabel(tab, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <EmptyState
              icon={<MaterialCommunityIcons name="calendar-remove-outline" size={30} color={c.textMuted} />}
              label={t('profile.hostedEmpty')}
              styles={styles}
            />
          </View>

          <View>
            <CardHeader
              icon={<Ionicons name="star" size={18} color={c.profileReviewsIconColor} />}
              iconBg={c.profileReviewsIconBg}
              title={t('profile.sectionReviews')}
              onPress={() => comingSoon(t('profile.sectionReviews'))}
              styles={styles}
              chevronColor={c.textSecondary}
            />
            <EmptyState
              icon={
                <View style={styles.starsRow}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Ionicons key={i} name="star-outline" size={20} color={c.textMuted} />
                  ))}
                </View>
              }
              label={t('profile.reviewsEmpty')}
              styles={styles}
            />
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingBottom: 128,
    },
    hero: {
      height: 160,
      backgroundColor: c.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 48,
    },
    heroIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.profileHeroGlassBg,
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
      backgroundColor: c.profileHeroGlassBg,
    },
    editButtonText: {
      color: c.white,
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
      backgroundColor: c.avatarCircleBg,
      borderWidth: 4,
      borderColor: c.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: c.primary,
      fontWeight: '700',
      fontSize: 40,
    },
    name: {
      marginTop: 12,
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
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
      borderLeftColor: c.divider,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: c.primary,
    },
    statLabel: {
      fontSize: 13,
      color: c.textSecondary,
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
      color: c.textPrimary,
    },
    groupRows: {
      marginTop: 16,
      gap: 12,
    },
    groupRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    groupRowLabel: {
      fontSize: 14,
      color: c.textPrimary,
    },
    groupRowValue: {
      fontSize: 16,
      fontWeight: '700',
      color: c.primary,
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
      backgroundColor: c.profileChipTintBg,
    },
    chipActive: {
      backgroundColor: c.primary,
    },
    chipText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.white,
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
      backgroundColor: c.profileChipTintBg,
    },
    tabPillActive: {
      backgroundColor: c.profileTabPillActiveBg,
      borderWidth: 1,
      borderColor: c.primary,
    },
    tabPillText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    tabPillTextActive: {
      color: c.primary,
      fontWeight: '700',
    },
    emptyState: {
      marginTop: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 32,
      backgroundColor: c.profileEmptyStateBg,
      borderRadius: 16,
    },
    emptyStateText: {
      fontSize: 14,
      color: c.textSecondary,
    },
    starsRow: {
      flexDirection: 'row',
      gap: 4,
    },
  });
}
