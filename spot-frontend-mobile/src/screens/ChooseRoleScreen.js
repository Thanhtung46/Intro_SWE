import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  background: '#F8F9FF',
  cardBg: 'rgba(255,255,255,0.7)',
  cardBorder: 'rgba(255,255,255,0.4)',
  selectedBorder: '#2563EB',
  selectedBg: '#EFF4FF',
  iconBg: '#EFF4FF',
  iconColor: '#004AC6',
  heading: '#000000',
  body: '#434655',
  primary: '#2563EB',
  primaryDisabled: '#A9C0F5',
  primaryText: '#EEEFFF',
};

// Skips the owner/referee verification-document upload step by design —
// this screen only handles role selection.
const ROLE_OPTIONS = [
  {
    id: 'player',
    title: 'Player',
    description: 'Find venues, connect with teams, and book matches easily.',
    renderIcon: (color) => <Ionicons name="football-outline" size={30} color={color} />,
  },
  {
    id: 'venue_owner',
    title: 'Venue Owner',
    description: 'Manage bookings, revenue, and optimize facility operations.',
    renderIcon: (color) => <MaterialCommunityIcons name="stadium-variant" size={30} color={color} />,
  },
  {
    id: 'referee',
    title: 'Referee',
    description: 'Receive match assignments, build a reputation, and support the sports community.',
    renderIcon: (color) => <MaterialCommunityIcons name="whistle-outline" size={30} color={color} />,
  },
];

function RoleCard({ option, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.roleCard, selected && styles.roleCardSelected]}
    >
      <View style={[styles.roleIconCircle, selected && styles.roleIconCircleSelected]}>
        {option.renderIcon(selected ? '#FFFFFF' : COLORS.iconColor)}
      </View>
      <Text style={styles.roleTitle}>{option.title}</Text>
      <Text style={styles.roleDescription}>{option.description}</Text>

      {selected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  );
}

export default function ChooseRoleScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
  };

  const handleComplete = () => {
    if (!selectedRole) return;
    // Owner/referee verification-document upload is intentionally out of
    // scope for this screen — role selection completes immediately.
    console.log('Selected role:', selectedRole);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={8} style={styles.headerSide}>
          <Ionicons name="arrow-back" size={20} color={COLORS.iconColor} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Register - Step 2
        </Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require('../../assets/Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.headingBlock}>
          <Text style={styles.heading}>Who are you?</Text>
          <Text style={styles.subheading}>
            Choose your role on the SPOT system.
          </Text>
        </View>

        <View style={styles.roleGrid}>
          {ROLE_OPTIONS.map((option) => (
            <RoleCard
              key={option.id}
              option={option}
              selected={selectedRole === option.id}
              onPress={() => setSelectedRole(option.id)}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.completeButton, !selectedRole && styles.completeButtonDisabled]}
            onPress={handleComplete}
            disabled={!selectedRole}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerSide: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.iconColor,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 32,
  },
  headingBlock: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.heading,
    textAlign: 'center',
  },
  subheading: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.body,
    textAlign: 'center',
  },
  roleGrid: {
    width: '100%',
    gap: 24,
    marginBottom: 40,
  },
  roleCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 32,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: COLORS.selectedBorder,
    backgroundColor: COLORS.selectedBg,
  },
  roleIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  roleIconCircleSelected: {
    backgroundColor: COLORS.iconColor,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.heading,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.body,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  backButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.iconColor,
  },
  completeButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: COLORS.primaryDisabled,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryText,
  },
});
