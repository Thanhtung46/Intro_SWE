import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import HostMatchScreen from '@/screens/matches/HostMatchScreen';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { getErrorMessage, getMatchDetail } from '@/services/matchService';
import type { Sport } from '@/types/match';

// Thin route — resolves sport then opens HostMatchScreen in edit mode
// (PATCH /matches/:id). Sibling of host-form.tsx (create).
export default function EditMatchRoute() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const [sport, setSport] = useState<Sport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isFinite(matchId)) {
      setError(t('matches.detail.notFound'));
      return;
    }
    getMatchDetail(matchId)
      .then((detail) => setSport(detail.match.sport))
      .catch((err) => setError(getErrorMessage(err)));
  }, [matchId]);

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ErrorBanner message={error} onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (!sport) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <HostMatchScreen
      sport={sport}
      matchId={matchId}
      onBack={() => router.back()}
      onCreated={() => router.back()}
      onUpdated={() => router.replace(`/matches/${matchId}`)}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screenBackgroundAlt,
    padding: spacing.md,
  },
});
