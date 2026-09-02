import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import type { VenueRegistration } from '@/types/referee';

type Props = {
  registration: VenueRegistration;
  onCancel: () => void;
};

/** "My Venues" section card on the Pending tab (Plan A) — a venue the
 *  referee has an ACTIVE pool registration for. */
export default function MyVenueCard({ registration, onCancel }: Props) {
  const { t } = useLanguage();
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.venue}>{registration.venueName}</Text>
        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{registration.sportType.toUpperCase()}</Text>
          </View>
          <Text style={styles.applied}>
            {new Date(registration.registeredAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        {registration.venueAddress ? <Text style={styles.address}>{registration.venueAddress}</Text> : null}
      </View>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelText}>{t('referee.invitations.cancelRegistration')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { gap: 6 },
  venue: { fontSize: 16, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: { backgroundColor: colors.selectedBackground, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  applied: { fontSize: 12, color: colors.subtitle },
  address: { fontSize: 12, color: colors.subtitle },
  cancelBtn: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d92d20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#d92d20', fontWeight: '800', fontSize: 14 },
});
