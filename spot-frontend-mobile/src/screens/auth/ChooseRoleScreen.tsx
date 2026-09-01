import React, { useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import RoleCard from '@/components/common/RoleCard';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { TranslationKey } from '@/i18n/translations';
import type { Role } from '@/types/auth';

function getRoleOptions(t: (key: TranslationKey) => string): {
  id: Role;
  title: string;
  description: string;
  icon: (color: string) => React.ReactNode;
}[] {
  return [
    {
      id: 'player',
      title: t('chooseRole.playerTitle'),
      description: t('chooseRole.playerDescription'),
      icon: (color) => <Ionicons name="football-outline" size={30} color={color} />,
    },
    {
      id: 'owner',
      title: t('chooseRole.ownerTitle'),
      description: t('chooseRole.ownerDescription'),
      icon: (color) => <MaterialCommunityIcons name="stadium-variant" size={30} color={color} />,
    },
    {
      id: 'referee',
      title: t('chooseRole.refereeTitle'),
      description: t('chooseRole.refereeDescription'),
      icon: (color) => <MaterialCommunityIcons name="whistle-outline" size={30} color={color} />,
    },
  ];
}

type Props = {
  selectedRole: Role | null;
  onSelectRole: (role: Role) => void;
  onBack: () => void;
  onContinue: () => void;
  submitting?: boolean;
  error?: string | null;
};

/**
 * Choose Role screen (Figma node 1:565). Player / Venue Owner / Referee
 * cards; role change happens locally until `onContinue` is pressed. When
 * reached from Register (see app/auth/choose-role.tsx), `onContinue` calls
 * POST /auth/role for real — `submitting`/`error` reflect that call's
 * loading/error state, per .claude/rules/api-conventions.md's contract.
 */
// Header title fades in once the user scrolls past roughly this many
// pixels — mirrors iOS's collapsing large-title nav bar (title text is
// blank while at the top, appears once content scrolls under the header).
const TITLE_FADE_RANGE = 40;

export default function ChooseRoleScreen({
  selectedRole,
  onSelectRole,
  onBack,
  onContinue,
  submitting,
  error,
}: Props) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const roleOptions = getRoleOptions(t);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, TITLE_FADE_RANGE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {/* Header's own background + border bar — hidden at the top,
            fades in together with the title on the same scroll range. */}
        <Animated.View
          style={[styles.headerBackground, { opacity: headerTitleOpacity }]}
          pointerEvents="none"
        />
        <TouchableOpacity onPress={onBack} hitSlop={8} style={styles.headerSide}>
          <Ionicons name="arrow-back" size={28} color={c.accentText} />
        </TouchableOpacity>
        <Animated.Text
          style={[styles.headerTitle, { opacity: headerTitleOpacity }]}
          numberOfLines={1}
        >
          {t('chooseRole.headerTitle')}
        </Animated.Text>
        <View style={styles.headerSide} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.headingBlock}>
          <Text style={styles.heading}>{t('chooseRole.heading')}</Text>
          <Text style={styles.subheading}>{t('chooseRole.subheading')}</Text>
        </View>

        <View style={styles.roleGrid}>
          {roleOptions.map((option) => (
            <RoleCard
              key={option.id}
              title={option.title}
              description={option.description}
              icon={option.icon}
              selected={selectedRole === option.id}
              onPress={() => onSelectRole(option.id)}
              themeColors={c}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.completeButton, (!selectedRole || submitting) && styles.completeButtonDisabled]}
          onPress={onContinue}
          disabled={!selectedRole || submitting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={styles.completeButtonText}>
            {submitting ? t('chooseRole.saving') : t('chooseRole.continueButton')}
          </Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.roleScreenBg,
    },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    // Solid (not translucent) so it reads as a clear bar once it fades in —
    // colors.cardBackground was too close to the screen background to
    // register as a distinct surface.
    headerBackground: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.authScreenBg,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    headerSide: {
      width: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: c.accentText,
      fontSize: 20,
      fontWeight: '700',
    },
    content: {
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    logo: {
      width: 64,
      height: 64,
      marginBottom: spacing.xl,
    },
    headingBlock: {
      alignItems: 'center',
      marginBottom: spacing.xl + spacing.sm,
    },
    heading: {
      fontSize: 22,
      fontWeight: '800',
      color: c.textPrimary,
      textAlign: 'center',
    },
    subheading: {
      marginTop: spacing.sm,
      fontSize: 16,
      fontWeight: '400',
      color: c.textSecondary,
      textAlign: 'center',
    },
    roleGrid: {
      width: '100%',
      gap: spacing.lg,
      marginBottom: spacing.xl + spacing.sm,
    },
    errorText: {
      color: c.roleErrorText,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    completeButton: {
      width: '100%',
      height: 56,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.buttonShadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 12.5,
      elevation: 8,
    },
    completeButtonDisabled: {
      backgroundColor: c.primaryDisabledBg,
    },
    completeButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.primaryDisabledText,
    },
  });
}
