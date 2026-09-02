import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import InfoDialog from '@/components/common/InfoDialog';
import InvitationCard from '@/components/referee/InvitationCard';
import MyVenueCard from '@/components/referee/MyVenueCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { getErrorMessage } from '@/services/apiErrors';
import {
  acceptAssignment,
  cancelVenueRegistration,
  declineAssignment,
  getAssignmentList,
  getPendingInvitations,
} from '@/services/refereeService';
import type { MatchInvitation, VenueRegistration } from '@/types/referee';

type ResultDialog = { tone: 'success' | 'warning'; title: string; message: string };

type Tab = 'pending' | 'confirmed' | 'completed';
type CompletedFilter = 'all' | 'completed' | 'declined';
type Status = 'loading' | 'ready' | 'error';

const COMPLETED_FILTER_KEY = {
  all: 'referee.invitations.filterAll',
  completed: 'referee.invitations.filterCompleted',
  declined: 'referee.invitations.filterDeclined',
} as const;

type Props = {
  onOpenAssignment: (assignmentId: number) => void;
  onGoToBoard: () => void;
};

export default function RefereeInvitationsScreen({ onOpenAssignment, onGoToBoard }: Props) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('pending');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [matchInvitations, setMatchInvitations] = useState<MatchInvitation[]>([]);
  const [myVenues, setMyVenues] = useState<VenueRegistration[]>([]);
  const [assignments, setAssignments] = useState<MatchInvitation[]>([]);
  const [completedFilter, setCompletedFilter] = useState<CompletedFilter>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VenueRegistration | null>(null);
  const [resultDialog, setResultDialog] = useState<ResultDialog | null>(null);

  const fetchTab = useCallback(
    async (which: Tab, filter: CompletedFilter) => {
      setStatus((s) => (s === 'ready' ? s : 'loading'));
      setErrorMessage('');
      try {
        if (which === 'pending') {
          const payload = await getPendingInvitations();
          setMatchInvitations(payload.matchInvitations);
          setMyVenues(payload.myVenues);
        } else {
          const payload = await getAssignmentList(which, which === 'completed' ? { filter } : undefined);
          setAssignments(payload.assignments);
        }
        setStatus('ready');
      } catch (e) {
        setErrorMessage(getErrorMessage(e));
        setStatus('error');
      }
    },
    []
  );

  useEffect(() => {
    fetchTab(tab, completedFilter);
  }, [tab, completedFilter, fetchTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTab(tab, completedFilter);
    setRefreshing(false);
  };

  const handleAccept = async (a: MatchInvitation) => {
    setBusyId(a.assignmentId);
    try {
      await acceptAssignment(a.assignmentId);
      setMatchInvitations((prev) => prev.filter((x) => x.assignmentId !== a.assignmentId));
      setResultDialog({ tone: 'success', title: t('common.success'), message: t('referee.invitations.accepted') });
    } catch (e) {
      const msg = getErrorMessage(e);
      setResultDialog({
        tone: 'warning',
        title: t('common.error'),
        message: /already accepted/i.test(msg) ? t('referee.invitations.alreadyTaken') : msg,
      });
      fetchTab('pending', completedFilter);
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (a: MatchInvitation) => {
    setBusyId(a.assignmentId);
    try {
      await declineAssignment(a.assignmentId);
      setMatchInvitations((prev) => prev.filter((x) => x.assignmentId !== a.assignmentId));
      setResultDialog({ tone: 'success', title: t('common.success'), message: t('referee.invitations.declined') });
    } catch (e) {
      setResultDialog({ tone: 'warning', title: t('common.error'), message: getErrorMessage(e) });
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancelVenue = async () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    try {
      await cancelVenueRegistration(target.venueId, target.sportType);
      setMyVenues((prev) => prev.filter((v) => v.registrationId !== target.registrationId));
    } catch (e) {
      setResultDialog({ tone: 'warning', title: t('common.error'), message: getErrorMessage(e) });
    }
  };

  const renderTabButton = (key: Tab, label: string) => (
    <TouchableOpacity
      key={key}
      style={[styles.tab, tab === key && styles.tabActive]}
      onPress={() => setTab(key)}
    >
      <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        {renderTabButton('pending', t('referee.invitations.tabPending'))}
        {renderTabButton('confirmed', t('referee.invitations.tabConfirmed'))}
        {renderTabButton('completed', t('referee.invitations.tabCompleted'))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {status === 'loading' ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
        {status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={() => fetchTab(tab, completedFilter)} />
        ) : null}

        {status === 'ready' && tab === 'pending' ? (
          <>
            <Text style={styles.sectionTitle}>{t('referee.invitations.pendingQueue')}</Text>
            {matchInvitations.length === 0 ? (
              <Text style={styles.empty}>{t('referee.invitations.emptyPending')}</Text>
            ) : (
              matchInvitations.map((a) => (
                <InvitationCard
                  key={a.assignmentId}
                  invitation={a}
                  onPress={() => onOpenAssignment(a.assignmentId)}
                  onApprove={() => handleAccept(a)}
                  onDecline={() => handleDecline(a)}
                  actionLoading={busyId === a.assignmentId}
                />
              ))
            )}

            <Text style={[styles.sectionTitle, styles.sectionSpacer]}>{t('referee.invitations.myVenues')}</Text>
            {myVenues.length === 0 ? (
              <View style={styles.emptyBlock}>
                <Text style={styles.empty}>{t('referee.invitations.emptyMyVenues')}</Text>
                <TouchableOpacity onPress={onGoToBoard}>
                  <Text style={styles.link}>{t('referee.invitations.findCourts')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myVenues.map((v) => (
                <MyVenueCard key={v.registrationId} registration={v} onCancel={() => setCancelTarget(v)} />
              ))
            )}
          </>
        ) : null}

        {status === 'ready' && tab === 'confirmed' ? (
          <>
            <Text style={styles.sectionTitle}>{t('referee.invitations.confirmedTitle')}</Text>
            {assignments.length === 0 ? (
              <Text style={styles.empty}>{t('referee.invitations.emptyConfirmed')}</Text>
            ) : (
              assignments.map((a) => (
                <InvitationCard key={a.assignmentId} invitation={a} onPress={() => onOpenAssignment(a.assignmentId)} />
              ))
            )}
          </>
        ) : null}

        {status === 'ready' && tab === 'completed' ? (
          <>
            <Text style={styles.sectionTitle}>{t('referee.invitations.completedTitle')}</Text>
            <View style={styles.filterRow}>
              {(['all', 'completed', 'declined'] as CompletedFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, completedFilter === f && styles.chipActive]}
                  onPress={() => setCompletedFilter(f)}
                >
                  <Text style={[styles.chipText, completedFilter === f && styles.chipTextActive]}>
                    {t(COMPLETED_FILTER_KEY[f])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {assignments.length === 0 ? (
              <Text style={styles.empty}>{t('referee.invitations.emptyCompleted')}</Text>
            ) : (
              assignments.map((a) => (
                <InvitationCard key={a.assignmentId} invitation={a} onPress={() => onOpenAssignment(a.assignmentId)} />
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={cancelTarget != null}
        title={t('referee.invitations.cancelTitle')}
        message={t('referee.invitations.cancelBody')}
        confirmLabel={t('referee.invitations.cancelConfirm')}
        cancelLabel={t('referee.invitations.keepIt')}
        onConfirm={confirmCancelVenue}
        onCancel={() => setCancelTarget(null)}
      />

      <InfoDialog
        visible={resultDialog != null}
        tone={resultDialog?.tone ?? 'success'}
        title={resultDialog?.title ?? ''}
        message={resultDialog?.message ?? ''}
        onDismiss={() => setResultDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBackground },
  tabs: {
    flexDirection: 'row',
    margin: spacing.md,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.subtitle },
  tabTextActive: { color: colors.white },
  content: { padding: spacing.md, paddingTop: 0, gap: spacing.md },
  loader: { marginTop: spacing.xl },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.headingText },
  sectionSpacer: { marginTop: spacing.md },
  empty: { fontSize: 14, color: colors.subtitle, paddingVertical: spacing.md },
  emptyBlock: { gap: spacing.xs, paddingVertical: spacing.sm },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.subtitle },
  chipTextActive: { color: colors.white },
});
