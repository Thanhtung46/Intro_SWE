import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import GroupScheduleGrid from '@/components/groups/GroupScheduleGrid';
import GroupMemberListItem from '@/components/groups/GroupMemberListItem';
import GroupGalleryGrid from '@/components/groups/GroupGalleryGrid';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import AppMap from '@/components/common/AppMap';
import { skillLabel, skillsForSport, skillTierColor } from '@/constants/matchSkills';
import {
  addGroupGalleryImage,
  cancelGroupJoinRequest,
  deleteGroupGalleryImage,
  getGroupDetail,
  getGroupSchedule,
  joinGroup,
  leaveGroup,
  listGroupGallery,
  listGroupMembers,
  listMyGroupJoinRequests,
  setGroupFavorite,
} from '@/services/groupService';
import { getErrorMessage } from '@/services/apiErrors';
import { formatDisplayDate, parseIsoDate, toIsoDate } from '@/utils/dateTime';
import type { GalleryImage, GroupDetail, GroupMember, ScheduleCourtRow } from '@/types/group';

type Status = 'loading' | 'ready' | 'error';
type DetailTab = 'about' | 'schedule' | 'members' | 'gallery';

type Props = {
  groupId: number;
  onBack: () => void;
  onOpenVenueMap: (venue: {
    venueName: string;
    venueAddress: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
  onManageRequests: () => void; // admin-only, shown when myRole==='ADMIN'
  onEditGroup: () => void; // admin-only
};

/**
 * Group Detail (Pencil "Matches - Group detail - About/Schedule/Member/
 * Gallery" frames, Groups implementation plan §"Per-screen design") — one
 * screen with an internal tab bar, mirroring MatchDetailScreen.tsx's hero/
 * location-card/action-bar layout for the About tab. Schedule/Members/
 * Gallery each lazy-fetch on first visit (useEffect keyed on `tab`, skip if
 * already loaded — same per-tab-fetch pattern as ManageMatchesScreen).
 *
 * `GroupDetail` has no `yourRequest`/`canJoin` field the way `MatchDetail`
 * does — pending-request state is derived by cross-referencing
 * listMyGroupJoinRequests() against this groupId (see fetchDetail below).
 */
export default function GroupDetailScreen({ groupId, onBack, onOpenVenueMap, onManageRequests, onEditGroup }: Props) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [tab, setTab] = useState<DetailTab>('about');
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [leaveDialogVisible, setLeaveDialogVisible] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  // Schedule tab — lazy-fetched on first visit, refetched whenever the date changes.
  const [scheduleDate, setScheduleDate] = useState(() => toIsoDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleCourts, setScheduleCourts] = useState<ScheduleCourtRow[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Members tab — lazy-fetched on first visit, refetched on search (debounced).
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [membersLoaded, setMembersLoaded] = useState(false);

  // Gallery tab — lazy-fetched on first visit.
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    setStatus('loading');
    try {
      const [detail, myRequests] = await Promise.all([
        getGroupDetail(groupId),
        listMyGroupJoinRequests({ status: 'PENDING' }),
      ]);
      setGroup(detail);
      setHasPendingRequest(myRequests.requests.some((r) => r.group.groupId === groupId));
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [groupId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await joinGroup(groupId);
      await fetchDetail();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsJoining(false);
    }
  };

  const handleConfirmLeave = async () => {
    setLeaveDialogVisible(false);
    setIsLeaving(true);
    try {
      await leaveGroup(groupId);
      onBack();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsLeaving(false);
    }
  };

  const handleConfirmCancelRequest = async () => {
    setCancelDialogVisible(false);
    setIsCancelling(true);
    try {
      await cancelGroupJoinRequest(groupId);
      await fetchDetail();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!group) return;
    const nextFavorited = !group.isFavorited;
    setGroup({ ...group, isFavorited: nextFavorited });
    try {
      await setGroupFavorite(groupId, nextFavorited);
    } catch (err) {
      setGroup((prev) => (prev ? { ...prev, isFavorited: !nextFavorited } : prev));
      Alert.alert('Something went wrong', getErrorMessage(err));
    }
  };

  const handleShareInvite = () => {
    if (!group) return;
    Share.share({
      message: `Join "${group.title}" on SPOT! spot://groups/${group.groupId}`,
    }).catch(() => undefined);
  };

  // Schedule tab: fetch whenever it's the active tab and the date changes.
  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError('');
    try {
      const result = await getGroupSchedule(groupId, scheduleDate);
      setScheduleCourts(result.courts);
    } catch (err) {
      setScheduleError(getErrorMessage(err));
    } finally {
      setScheduleLoading(false);
    }
  }, [groupId, scheduleDate]);

  useEffect(() => {
    if (tab === 'schedule') fetchSchedule();
  }, [tab, fetchSchedule]);

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setScheduleDate(toIsoDate(selected));
  };

  // Members tab: fetch on first visit, refetch on search (debounced).
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError('');
    try {
      const result = await listGroupMembers(groupId, { search: memberSearch || undefined, limit: 50 });
      setMembers(result.members);
      setMembersTotal(result.total);
      setMembersLoaded(true);
    } catch (err) {
      setMembersError(getErrorMessage(err));
    } finally {
      setMembersLoading(false);
    }
  }, [groupId, memberSearch]);

  useEffect(() => {
    if (tab !== 'members') return;
    const handle = setTimeout(fetchMembers, membersLoaded ? 300 : 0); // debounce only on search edits, not the first load
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fetchMembers]);

  // Gallery tab: fetch once on first visit.
  const fetchGallery = useCallback(async () => {
    setGalleryLoading(true);
    setGalleryError('');
    try {
      const result = await listGroupGallery(groupId);
      setImages(result.images);
      setGalleryLoaded(true);
    } catch (err) {
      setGalleryError(getErrorMessage(err));
    } finally {
      setGalleryLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (tab === 'gallery' && !galleryLoaded) fetchGallery();
  }, [tab, galleryLoaded, fetchGallery]);

  const handleAddImage = async () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setIsAddingImage(true);
    try {
      const image = await addGroupGalleryImage(groupId, url);
      setImages((prev) => [...prev, image]);
      setNewImageUrl('');
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleConfirmDeleteImage = async () => {
    if (deleteImageId == null) return;
    const imageId = deleteImageId;
    setDeleteImageId(null);
    try {
      await deleteGroupGalleryImage(groupId, imageId);
      setImages((prev) => prev.filter((img) => img.imageId !== imageId));
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
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
        <ErrorBanner message={errorMessage || 'Group not found.'} onRetry={fetchDetail} />
      </SafeAreaView>
    );
  }

  const locationLine =
    [group.cityName, group.provinceName].filter(Boolean).join(', ') || group.venueName;
  const skillTiers = skillsForSport(group.sport);
  const minRank = skillTiers.find((s) => s.code === group.skillMin)?.rank;
  const maxRank = skillTiers.find((s) => s.code === group.skillMax)?.rank;
  const skillRangeCodes =
    group.allLevels || minRank == null || maxRank == null
      ? []
      : skillTiers.filter((s) => s.rank >= minRank && s.rank <= maxRank).map((s) => s.code);
  const isMember = group.myRole === 'MEMBER';
  const isAdmin = group.myRole === 'ADMIN';
  const canJoin = group.myRole == null && !hasPendingRequest;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          {group.coverUrl ? (
            <Image source={{ uri: group.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            {group.logoUrl ? <Image source={{ uri: group.logoUrl }} style={styles.heroLogo} /> : null}
            <Text style={styles.heroTitle} numberOfLines={2} ellipsizeMode="tail">
              {group.name}
            </Text>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location" size={13} color={colors.white} />
              <Text style={styles.heroSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {locationLine}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          {(
            [
              { key: 'about', label: 'About' },
              { key: 'schedule', label: 'Schedule' },
              { key: 'members', label: 'Members' },
              { key: 'gallery', label: 'Gallery' },
            ] as { key: DetailTab; label: string }[]
          ).map((item) => {
            const isActive = item.key === tab;
            return (
              <TouchableOpacity
                key={item.key}
                testID={`group-detail-tab-${item.key}`}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setTab(item.key)}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.body}>
          {tab === 'about' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About Group</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{group.description || 'No description yet.'}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.skillHeaderRow}>
                  <Ionicons name="stats-chart" size={14} color={colors.primaryDark} />
                  <Text style={styles.skillHeaderText}>SKILL LEVELS</Text>
                </View>
                <View style={styles.skillChips}>
                  {skillRangeCodes.length === 0 ? (
                    <View style={[styles.skillChip, { backgroundColor: colors.skillTierGreenBg, borderColor: colors.skillTierGreenBorder }]}>
                      <Text style={[styles.skillChipText, { color: colors.skillTierGreenText }]}>All Levels</Text>
                    </View>
                  ) : (
                    skillRangeCodes.map((code) => {
                      const tier = skillTierColor(group.sport, code);
                      return (
                        <View key={code} style={[styles.skillChip, { backgroundColor: tier.bg, borderColor: tier.border }]}>
                          <Text style={[styles.skillChipText, { color: tier.text }]}>{skillLabel(group.sport, code)}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.venueLabel}>HOME VENUE</Text>
                <View style={styles.venueCard}>
                  <Text style={styles.venueName} numberOfLines={1} ellipsizeMode="tail">
                    {group.venueName}
                  </Text>
                  {group.latitude != null && group.longitude != null ? (
                    <TouchableOpacity
                      testID="group-detail-map"
                      style={styles.venueMap}
                      onPress={() =>
                        onOpenVenueMap({
                          venueName: group.venueName,
                          venueAddress: group.venueAddress,
                          latitude: group.latitude,
                          longitude: group.longitude,
                        })
                      }
                      activeOpacity={0.9}
                    >
                      <AppMap
                        markers={[
                          {
                            id: String(group.groupId),
                            latitude: group.latitude,
                            longitude: group.longitude,
                            tintColor: colors.primaryDark,
                            emoji: '📍',
                          },
                        ]}
                        initialRegion={{
                          latitude: group.latitude,
                          longitude: group.longitude,
                          latitudeDelta: 0.02,
                          longitudeDelta: 0.02,
                        }}
                      />
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.venueAddressRow}>
                    <Ionicons name="location-outline" size={14} color={colors.bodyText} />
                    <Text style={styles.venueAddressText} numberOfLines={1} ellipsizeMode="tail">
                      {group.venueAddress}
                    </Text>
                  </View>
                  <TouchableOpacity
                    testID="group-detail-directions"
                    style={styles.directionsButton}
                    onPress={() =>
                      onOpenVenueMap({
                        venueName: group.venueName,
                        venueAddress: group.venueAddress,
                        latitude: group.latitude,
                        longitude: group.longitude,
                      })
                    }
                  >
                    <Ionicons name="navigate-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.directionsButtonText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity testID="group-detail-share-invite" style={styles.shareButton} onPress={handleShareInvite}>
                <Ionicons name="share-social-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.shareButtonText}>Share Group Invite Link</Text>
              </TouchableOpacity>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Members ({group.memberCount})</Text>
                  <TouchableOpacity onPress={() => setTab('members')}>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.memberAvatarRow}>
                  {group.memberAvatars.slice(0, 3).map((uri, index) => (
                    <Image key={index} source={{ uri }} style={[styles.memberAvatar, index > 0 && styles.memberAvatarOverlap]} />
                  ))}
                </View>
              </View>

              {isAdmin && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Admin Tools</Text>
                  <TouchableOpacity testID="group-detail-edit" style={styles.shareButton} onPress={onEditGroup}>
                    <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.shareButtonText}>Edit Group</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="group-detail-manage-requests" style={styles.manageButton} onPress={onManageRequests}>
                    <Ionicons name="settings-outline" size={16} color={colors.white} />
                    <Text style={styles.manageButtonText}>Manage Requests</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {tab === 'schedule' && (
            <>
              <TouchableOpacity testID="group-schedule-date" style={styles.pickerField} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.pickerValue}>{formatDisplayDate(scheduleDate)}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={parseIsoDate(scheduleDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
              {scheduleLoading ? (
                <ActivityIndicator style={styles.tabSpinner} color={colors.primary} />
              ) : scheduleError ? (
                <ErrorBanner message={scheduleError} onRetry={fetchSchedule} />
              ) : (
                <GroupScheduleGrid courts={scheduleCourts} />
              )}
            </>
          )}

          {tab === 'members' && (
            <>
              <View style={styles.searchField}>
                <Ionicons name="search-outline" size={16} color={colors.outline} />
                <TextInput
                  testID="group-members-search"
                  style={styles.searchInput}
                  placeholder="Search members..."
                  placeholderTextColor={colors.outline}
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                />
              </View>
              {membersLoading && members.length === 0 ? (
                <ActivityIndicator style={styles.tabSpinner} color={colors.primary} />
              ) : membersError ? (
                <ErrorBanner message={membersError} onRetry={fetchMembers} />
              ) : members.length === 0 ? (
                <Text style={styles.placeholderText}>No members found.</Text>
              ) : (
                <View style={styles.membersList}>
                  {members.map((member) => (
                    <GroupMemberListItem key={member.userId} member={member} sport={group.sport} />
                  ))}
                  {membersTotal > members.length && (
                    <Text style={styles.helperTextCenter}>Showing {members.length} of {membersTotal}.</Text>
                  )}
                </View>
              )}
            </>
          )}

          {tab === 'gallery' && (
            <>
              {isAdmin && (
                <View style={styles.addPhotoRow}>
                  <TextInput
                    testID="group-gallery-add-url"
                    style={[styles.input, styles.addPhotoInput]}
                    placeholder="Paste an image URL..."
                    placeholderTextColor={colors.outline}
                    value={newImageUrl}
                    onChangeText={setNewImageUrl}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    testID="group-gallery-add-submit"
                    style={[styles.addPhotoButton, isAddingImage && styles.joinButtonDisabled]}
                    onPress={handleAddImage}
                    disabled={isAddingImage}
                  >
                    <Ionicons name="add" size={18} color={colors.white} />
                  </TouchableOpacity>
                </View>
              )}
              {galleryLoading ? (
                <ActivityIndicator style={styles.tabSpinner} color={colors.primary} />
              ) : galleryError ? (
                <ErrorBanner message={galleryError} onRetry={fetchGallery} />
              ) : (
                <GroupGalleryGrid images={images} isAdmin={isAdmin} onRequestDelete={setDeleteImageId} />
              )}
            </>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.heroTopBarWrap}>
        <View style={styles.heroTopBar}>
          <TouchableOpacity testID="group-detail-back" style={styles.heroIconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity testID="group-detail-favorite" style={styles.heroIconButton} onPress={handleToggleFavorite}>
            <Ionicons name={group.isFavorited ? 'heart' : 'heart-outline'} size={18} color={group.isFavorited ? colors.error : colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {tab === 'about' && !isAdmin && (
        <SafeAreaView edges={['bottom']} style={styles.actionBarWrap}>
          <View style={styles.actionBar}>
            {isMember ? (
              <TouchableOpacity
                testID="group-detail-leave"
                style={[styles.leaveButton, isLeaving && styles.joinButtonDisabled]}
                onPress={() => setLeaveDialogVisible(true)}
                disabled={isLeaving}
              >
                <Text style={styles.leaveButtonText}>{isLeaving ? 'Leaving...' : 'Leave Group'}</Text>
              </TouchableOpacity>
            ) : hasPendingRequest ? (
              <TouchableOpacity
                testID="group-detail-cancel-request"
                style={[styles.cancelRequestButton, isCancelling && styles.joinButtonDisabled]}
                onPress={() => setCancelDialogVisible(true)}
                disabled={isCancelling}
              >
                <Text style={styles.cancelRequestButtonText}>{isCancelling ? 'Cancelling...' : 'Cancel Request'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="group-detail-join"
                style={[styles.joinButton, (!canJoin || isJoining) && styles.joinButtonDisabled]}
                onPress={handleJoin}
                disabled={!canJoin || isJoining}
              >
                <Text style={styles.joinButtonText}>{isJoining ? 'Joining...' : 'Join Group'}</Text>
                {canJoin && !isJoining && <Ionicons name="flash" size={16} color={colors.white} />}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      )}

      <ConfirmDialog
        visible={leaveDialogVisible}
        title="Leave this group?"
        message="You'll need to send a new join request to get back in."
        confirmLabel="Leave Group"
        cancelLabel="Stay"
        onConfirm={handleConfirmLeave}
        onCancel={() => setLeaveDialogVisible(false)}
      />

      <ConfirmDialog
        visible={cancelDialogVisible}
        title="Cancel request?"
        message="You can send a new request again later."
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setCancelDialogVisible(false)}
      />

      <ConfirmDialog
        visible={deleteImageId != null}
        title="Remove this photo?"
        message="This can't be undone."
        confirmLabel="Remove"
        onConfirm={handleConfirmDeleteImage}
        onCancel={() => setDeleteImageId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.screenBackground },
  scrollContent: { paddingBottom: 140 },

  hero: { height: 220, overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.heroScrim },
  heroContent: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.lg, gap: spacing.xs },
  heroLogo: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.white, marginBottom: spacing.xs },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: 2 },
  heroSubtitle: { color: colors.white, fontSize: 13, opacity: 0.9, flexShrink: 1 },

  heroTopBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  heroIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.stickyIconButtonBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  skillHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  skillHeaderText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: colors.primaryDark },
  skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillChipText: { fontSize: 12, fontWeight: '700' },

  venueLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: colors.outline },
  venueCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  venueName: { fontSize: 17, fontWeight: '800', color: colors.headingText },
  venueMap: { height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.iconBackground },
  venueAddressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  venueAddressText: { fontSize: 13, color: colors.bodyText, flexShrink: 1 },
  directionsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  directionsButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.iconBackground,
    gap: spacing.xxs,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 8 },
  tabButtonActive: { backgroundColor: colors.primaryDark },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: colors.outline },
  tabButtonTextActive: { color: colors.white },

  body: { padding: spacing.md, gap: spacing.lg },

  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  shareButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  section: { gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  seeAllText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  manageButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },

  notesCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md },
  notesText: { fontSize: 13, color: colors.bodyText, lineHeight: 20 },


  memberAvatarRow: { flexDirection: 'row' },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.iconBackground,
  },
  memberAvatarOverlap: { marginLeft: -10 },

  placeholder: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  placeholderText: { fontSize: 13, color: colors.outline, textAlign: 'center' },

  tabSpinner: { marginTop: spacing.lg },
  helperTextCenter: { fontSize: 12, color: colors.outline, textAlign: 'center', marginTop: spacing.xs },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  pickerValue: { fontSize: 14, color: colors.headingText },

  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.headingText, paddingVertical: 0 },
  membersList: { gap: spacing.sm },

  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.headingText,
    backgroundColor: colors.white,
  },
  addPhotoRow: { flexDirection: 'row', gap: spacing.sm },
  addPhotoInput: { flex: 1 },
  addPhotoButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.iconBackground,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  joinButtonDisabled: { backgroundColor: colors.outline },
  joinButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },

  leaveButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  leaveButtonText: { fontSize: 16, fontWeight: '700', color: colors.error },

  cancelRequestButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  cancelRequestButtonText: { fontSize: 16, fontWeight: '700', color: colors.error },
});
