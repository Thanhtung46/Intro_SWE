import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import CreateGroupScreen from '@/screens/groups/CreateGroupScreen';
import { getErrorMessage } from '@/services/apiErrors';
import { getGroupDetail } from '@/services/groupService';
import type { GroupDetail } from '@/types/group';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// CreateGroupScreen has no loading state of its own in edit mode, so this
// route pre-fetches getGroupDetail(groupId) and passes it as `initialGroup`
// (Groups implementation plan §"CreateGroupScreen" / build Step 6).
export default function EditGroupRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const fetchGroup = useCallback(async () => {
    setStatus('loading');
    try {
      const detail = await getGroupDetail(groupId);
      if (detail.myRole !== 'ADMIN') {
        router.replace(`/groups/${groupId}`);
        return;
      }
      setGroup(detail);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }, [groupId, router]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  if (status === 'ready' && group) {
    return (
      <CreateGroupScreen
        sport={group.sport}
        mode="edit"
        groupId={groupId}
        initialGroup={group}
        onBack={() => router.back()}
        onSaved={(savedId) => router.replace(`/groups/${savedId}`)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {status === 'error' ? (
        <ErrorBanner message={error} onRetry={fetchGroup} />
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBackground },
});
