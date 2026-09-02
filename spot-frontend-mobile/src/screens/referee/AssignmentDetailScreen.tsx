import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { getErrorMessage } from '@/services/apiErrors';
import { acceptAssignment, declineAssignment, getAssignmentDetail } from '@/services/refereeService';
import { getVenueDetail, PublicVenue } from '@/services/venueService';
import type { AssignmentDetail } from '@/types/referee';
import { openDirections } from '@/utils/directions';
import { formatVnd } from '@/utils/format';
import { formatDayLabel, formatTimeRange } from '@/utils/refereeFormat';
import { showAlert } from '@/utils/showAlert';

type Props = {
  assignmentId: number;
  onBack: () => void;
  onDone: () => void;
};

export default function AssignmentDetailScreen({ assignmentId, onBack, onDone }: Props) {
  const { t } = useLanguage();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [fieldCount, setFieldCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const a = await getAssignmentDetail(assignmentId);
      setAssignment(a);
      const v = await getVenueDetail(a.venueId).catch(() => null);
      if (v?.success) {
        setVenue(v.venue ?? null);
        setFieldCount(v.fields?.length ?? null);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await acceptAssignment(assignmentId);
      showAlert(t('referee.invitations.accepted'));
      onDone();
    } catch (e) {
      const msg = getErrorMessage(e);
      showAlert(/already accepted/i.test(msg) ? t('referee.invitations.alreadyTaken') : msg);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await declineAssignment(assignmentId);
      showAlert(t('referee.invitations.declined'));
      onDone();
    } catch (e) {
      showAlert(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error || !assignment ? (
        <View style={styles.center}>
          <ErrorBanner message={error || t('referee.assignment.notFound')} onRetry={load} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Ionicons name="arrow-back" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.badgeRow}>
                {venue && venue.ratingCount > 0 ? (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F5A623" />
                    <Text style={styles.ratingText}>
                      {venue.avgRating.toFixed(1)} ({venue.ratingCount})
                    </Text>
                  </View>
                ) : null}
                <View style={styles.sportBadge}>
                  <Text style={styles.sportBadgeText}>{assignment.sportType}</Text>
                </View>
              </View>
              <Text style={styles.venueName}>{assignment.venueName}</Text>
              {assignment.venueAddress ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={colors.bodyText} />
                  <Text style={styles.meta}>{assignment.venueAddress}</Text>
                </View>
              ) : null}
              {assignment.playerName ? (
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={14} color={colors.bodyText} />
                  <Text style={styles.meta}>{assignment.playerName}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.quickGrid}>
              <View style={styles.quickCell}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.quickLabel}>{t('referee.assignment.hours')}</Text>
                <Text style={styles.quickValue}>
                  {venue?.openingHours && venue?.closingHours
                    ? `${venue.openingHours} - ${venue.closingHours}`
                    : '—'}
                </Text>
              </View>
              <View style={styles.quickCell}>
                <Ionicons name="football-outline" size={18} color={colors.primary} />
                <Text style={styles.quickLabel}>{t('referee.assignment.capacity')}</Text>
                <Text style={styles.quickValue}>
                  {fieldCount != null ? t('referee.assignment.pitches').replace('{count}', String(fieldCount)) : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('referee.assignment.location')}</Text>
              <View style={styles.locationCard}>
                <Ionicons name="navigate-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.locationText}>{assignment.venueAddress ?? assignment.venueName}</Text>
              </View>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() =>
                  openDirections({
                    latitude: venue?.latitude ?? null,
                    longitude: venue?.longitude ?? null,
                    venueName: assignment.venueName,
                    venueAddress: assignment.venueAddress ?? '',
                  })
                }
              >
                <Ionicons name="open-outline" size={16} color={colors.primary} />
                <Text style={styles.directionsText}>{t('referee.assignment.getDirections')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('referee.assignment.paymentBreakdown')}</Text>
              <View style={styles.payCard}>
                <View style={styles.payRow}>
                  <Text style={styles.payLabel}>{t('referee.assignment.baseFee')}</Text>
                  <Text style={styles.payValue}>{formatVnd(assignment.feeVnd)}</Text>
                </View>
                <View style={styles.payDivider} />
                <View style={styles.payRow}>
                  <Text style={styles.payTotalLabel}>{t('referee.assignment.total')}</Text>
                  <Text style={styles.payTotal}>{formatVnd(assignment.feeVnd)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.whenCard}>
              <Ionicons name="calendar-outline" size={16} color={colors.bodyText} />
              <Text style={styles.whenText}>
                {formatDayLabel(assignment.startsAt)} · {formatTimeRange(assignment.startsAt, assignment.endsAt)}
              </Text>
            </View>
          </ScrollView>

          {assignment.status === 'PENDING' ? (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={busy}>
                <Text style={styles.declineText}>{t('referee.invitations.decline')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={handleAccept} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.approveText}>{t('referee.invitations.approve')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.footer}>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{assignment.status}</Text>
              </View>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { paddingBottom: spacing.xl },
  hero: { height: 200, justifyContent: 'flex-start' },
  backBtn: {
    margin: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    margin: spacing.md,
    marginTop: -40,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.selectedBackground, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { fontSize: 12, fontWeight: '700', color: colors.headingText },
  sportBadge: { backgroundColor: colors.selectedBackground, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  sportBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  venueName: { fontSize: 22, fontWeight: '800', color: colors.headingText },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13, color: colors.bodyText, flexShrink: 1 },
  quickGrid: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md },
  quickCell: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLabel: { fontSize: 12, color: colors.subtitle },
  quickValue: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  section: { padding: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.headingText },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationText: { flex: 1, fontSize: 13, color: colors.bodyText },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  directionsText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  payCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payLabel: { fontSize: 14, color: colors.bodyText },
  payValue: { fontSize: 14, color: colors.bodyText },
  payDivider: { height: 1, backgroundColor: colors.border },
  payTotalLabel: { fontSize: 15, fontWeight: '800', color: colors.headingText },
  payTotal: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  whenCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md },
  whenText: { fontSize: 13, color: colors.bodyText },
  footer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  declineBtn: {
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d92d20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { color: '#d92d20', fontWeight: '800' },
  approveBtn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  statusPill: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.selectedBackground, alignItems: 'center', justifyContent: 'center' },
  statusPillText: { fontWeight: '800', color: colors.primaryDark },
});
