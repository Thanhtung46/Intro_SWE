import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel, skillTierColor } from '@/constants/matchSkills';
import {
  deleteGroup,
  getGroupDetail,
  kickGroupMember,
  listGroupMembers,
  transferGroupAdmin,
} from '@/services/groupService';
import { getErrorMessage } from '@/services/apiErrors';
import type { Group, GroupMember } from '@/types/group';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  groupId: number;
  onBack: () => void;
  onEditGroup: () => void;
};

/**
 * Manage Requests / admin console for one group — mirrors
 * ManageSquadScreen.tsx's role as a separate admin screen for Matches, but
 * narrower scope (Groups implementation plan resolved decisions #1, #5):
 * no Pending Approval here (that's aggregated in ManageGroupsScreen's
 * Managed tab) — just the Members list with Kick/Make-Admin actions, plus
 * Edit Group and Disband Group entry points.
 */
export default function ManageGroupRequestsScreen({ groupId, onBack, onEditGroup }: Props) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [kickTarget, setKickTarget] = useState<GroupMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<GroupMember | null>(null);
  const [disbandDialogVisible, setDisbandDialogVisible] = useState(false);
  const [actingUserId, setActingUserId] = useState<number | null>(null);
  const [isDisbanding, setIsDisbanding] = useState(false);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    try {
      const [detail, membersResult] = await Promise.all([
        getGroupDetail(groupId),
        // Backend caps members `limit` at 50 (list-members.dto.js) — 100 → 400.
        listGroupMembers(groupId, { limit: 50 }),
      ]);
      setGroup(detail);
      setMembers(membersResult.members);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmKick = async () => {
    if (!kickTarget) return;
    const userId = kickTarget.userId;
    setKickTarget(null);
    setActingUserId(userId);
    try {
      await kickGroupMember(groupId, userId);
      await fetchData();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setActingUserId(null);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferTarget) return;
    const userId = transferTarget.userId;
    setTransferTarget(null);
    setActingUserId(userId);
    try {
      await transferGroupAdmin(groupId, userId);
      await fetchData();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setActingUserId(null);
    }
  };

  const handleConfirmDisband = async () => {
    setDisbandDialogVisible(false);
    setIsDisbanding(true);
    try {
      await deleteGroup(groupId);
      onBack();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsDisbanding(false);
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (status === 'error' || !group) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ErrorBanner message={errorMessage || 'Group not found.'} onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="manage-group-requests-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Manage Group</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{group.name} · {group.memberCount} members</Text>
        </View>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actionsRow}>
          <TouchableOpacity testID="manage-group-edit" style={styles.outlineButton} onPress={onEditGroup}>
            <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.outlineButtonText}>Edit Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="manage-group-disband"
            style={[styles.disbandButton, isDisbanding && styles.disbandButtonDisabled]}
            onPress={() => setDisbandDialogVisible(true)}
            disabled={isDisbanding}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.disbandButtonText}>{isDisbanding ? 'Disbanding...' : 'Disband Group'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{members.length}</Text>
          </View>
        </View>

        {members.map((member) => {
          const label = skillLabel(group.sport, member.skill ?? null);
          const tier = skillTierColor(group.sport, member.skill ?? null);
          const isActing = actingUserId === member.userId;
          return (
            <View key={member.userId} style={styles.memberRow}>
              <View style={styles.avatar}>
                {member.avatarUrl ? (
                  <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{(member.fullName || 'P').charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
                  {member.fullName}
                </Text>
                {label && (
                  <View style={[styles.skillPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
                    <Text style={[styles.skillPillText, { color: tier.text }]}>{label}</Text>
                  </View>
                )}
              </View>
              {member.isAdmin ? (
                <View style={styles.adminTag}>
                  <Text style={styles.adminTagText}>ADMIN</Text>
                </View>
              ) : (
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    testID={`make-admin-${member.userId}`}
                    style={styles.transferButton}
                    disabled={isActing}
                    onPress={() => setTransferTarget(member)}
                  >
                    <Text style={styles.transferButtonText}>Make Admin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`kick-member-${member.userId}`}
                    style={styles.kickButton}
                    disabled={isActing}
                    onPress={() => setKickTarget(member)}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <ConfirmDialog
        visible={kickTarget != null}
        title="Kick this member?"
        message={`${kickTarget?.fullName ?? 'This member'} will be removed and won't be able to rejoin this group.`}
        confirmLabel="Kick"
        destructive
        onConfirm={handleConfirmKick}
        onCancel={() => setKickTarget(null)}
      />

      <ConfirmDialog
        visible={transferTarget != null}
        title="Make this member admin?"
        message={`You'll become a regular member and ${transferTarget?.fullName ?? 'they'} will take over as admin.`}
        confirmLabel="Make Admin"
        destructive={false}
        onConfirm={handleConfirmTransfer}
        onCancel={() => setTransferTarget(null)}
      />

      <ConfirmDialog
        visible={disbandDialogVisible}
        title="Disband this group?"
        message="This permanently deletes the group for everyone. This can't be undone."
        confirmLabel="Disband"
        destructive
        onConfirm={handleConfirmDisband}
        onCancel={() => setDisbandDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.screenBackground },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  subtitle: { fontSize: 12, color: colors.outline },

  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  outlineButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  disbandButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  disbandButtonDisabled: { opacity: 0.6 },
  disbandButtonText: { fontSize: 13, fontWeight: '700', color: colors.error },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.headingText },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  memberInfo: { flex: 1, gap: spacing.xxs },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  skillPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillPillText: { fontSize: 10, fontWeight: '700' },
  adminTag: { backgroundColor: colors.primaryDark, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  adminTagText: { fontSize: 10, fontWeight: '700', color: colors.white },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  transferButton: { borderWidth: 1, borderColor: colors.primaryDark, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  transferButtonText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  kickButton: { padding: spacing.xxs },
});
