import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { getErrorMessage } from '@/services/apiErrors';
import { getRefereeCertifications, getRefereeMe } from '@/services/refereeService';
import type { RefereeCertification, RefereeProfile } from '@/types/referee';

type Props = {
  onBack: () => void;
  onEdit: () => void;
};

const KIND_LABEL_KEY: Record<string, TranslationKey> = {
  ID_FRONT: 'referee.docKind.ID_FRONT',
  ID_BACK: 'referee.docKind.ID_BACK',
  VFF_LICENSE: 'referee.docKind.VFF_LICENSE',
  CERT_UPDATE: 'referee.docKind.CERT_UPDATE',
};

export default function RefereeProfileScreen({ onBack, onEdit }: Props) {
  const { t } = useLanguage();
  const docKindLabel = (kind?: string | null) => {
    const key = kind ? KIND_LABEL_KEY[kind] : undefined;
    return key ? t(key) : t('referee.docKind.fallback');
  };
  const [profile, setProfile] = useState<RefereeProfile | null>(null);
  const [certs, setCerts] = useState<RefereeCertification[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, c] = await Promise.all([getRefereeMe(), getRefereeCertifications()]);
      setProfile(p);
      setCerts(c);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={26} color={colors.primaryDark} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit} hitSlop={8}>
          <Text style={styles.edit}>{t('referee.profile.edit')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error || !profile ? (
        <View style={styles.center}>
          <ErrorBanner message={error || t('referee.profile.loadError')} onRetry={load} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile.fullName || 'R').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.role}>{t('referee.profile.certifiedReferee')}</Text>

          <View style={styles.chips}>
            {profile.certifiedSportTypes.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t('referee.profile.matches')}</Text>
              <Text style={styles.statValue}>{profile.totalMatchesOfficiated}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t('referee.profile.rating')}</Text>
              <Text style={styles.statValue}>
                {profile.ratingCount > 0 ? `${profile.avgRating.toFixed(1)} ★` : '—'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{t('referee.profile.certifications')}</Text>
          {certs.map((cert) => (
            <View key={cert.verificationReqId} style={styles.certRow}>
              <Ionicons
                name={cert.documentKind === 'VFF_LICENSE' ? 'document-text-outline' : 'id-card-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.certName}>{docKindLabel(cert.documentKind)}</Text>
              <Text
                style={[
                  styles.certStatus,
                  cert.status === 'APPROVED' && styles.certApproved,
                  cert.status === 'REJECTED' && styles.certRejected,
                ]}
              >
                {cert.status}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  edit: { fontSize: 15, fontWeight: '700', color: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 22, fontWeight: '800', color: colors.headingText },
  role: { fontSize: 12, fontWeight: '700', color: colors.subtitle, letterSpacing: 1 },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { backgroundColor: colors.selectedBackground, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  statRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: colors.border },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.subtitle, letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.headingText },
  sectionTitle: { alignSelf: 'flex-start', fontSize: 18, fontWeight: '800', color: colors.headingText, marginTop: spacing.sm },
  certRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.headingText },
  certStatus: { fontSize: 11, fontWeight: '800', color: colors.subtitle },
  certApproved: { color: colors.success },
  certRejected: { color: colors.error },
});
