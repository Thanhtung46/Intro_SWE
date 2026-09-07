import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';

export type SlidingTabKey = 'home' | 'booking' | 'matches' | 'schedule' | 'settings';

export type SlidingTab = {
  key: SlidingTabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** Pill glide duration — keep in sync with NAV_DELAY_MS so remount lands after the glide. */
const GLIDE_MS = 320;
const GLIDE = {
  duration: GLIDE_MS,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};
/** Wait for most of the glide on the *current* shell before replace remounts AppShell. */
const NAV_DELAY_MS = 300;

/** Survives AppShell remounts so the next screen can snap/continue from here. */
let lastPillFrame = { x: 0, width: 0, index: -1 };

type Props = {
  tabs: SlidingTab[];
  active: SlidingTabKey;
  onPress: (key: SlidingTabKey) => void;
  style?: object;
  activeColor: string;
  inactiveColor: string;
};

function frameForIndex(
  index: number,
  rowWidth: number,
  tabCount: number,
  size: { width: number; height: number }
) {
  const slot = rowWidth / tabCount;
  return {
    x: index * slot + (slot - size.width) / 2,
    width: size.width,
    height: size.height,
  };
}

/**
 * Bottom tabs with a sliding blue pill.
 *
 * Tab screens each remount AppShell, which would kill an in-flight Reanimated
 * spring. So on press we glide on the *current* instance, then delay
 * `onPress` (router.replace) until the glide has mostly finished. Remount
 * snaps to `lastPillFrame` (already at the target).
 */
export default function SlidingBottomNav({
  tabs,
  active,
  onPress,
  style,
  activeColor,
  inactiveColor,
}: Props) {
  const { colors: themeColors } = useTheme();
  const routeActiveIndex = Math.max(0, tabs.findIndex((t) => t.key === active));
  const [visualIndex, setVisualIndex] = useState(routeActiveIndex);
  const [rowWidth, setRowWidth] = useState(0);
  const [innerSizes, setInnerSizes] = useState<{ width: number; height: number }[]>(() =>
    tabs.map(() => ({ width: 0, height: 0 }))
  );
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeyRef = useRef<SlidingTabKey | null>(null);
  /** Press already started the glide — skip the next visualIndex sync so it doesn't snap/cancel. */
  const skipSyncRef = useRef(false);

  const translateX = useSharedValue(lastPillFrame.x);
  const pillWidth = useSharedValue(lastPillFrame.width);
  const pillHeight = useSharedValue(0);
  const pillOpacity = useSharedValue(lastPillFrame.width > 0 ? 1 : 0);

  useEffect(() => {
    setVisualIndex(routeActiveIndex);
  }, [routeActiveIndex]);

  useEffect(
    () => () => {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    },
    []
  );

  const movePillTo = (index: number, animated: boolean) => {
    const size = innerSizes[index];
    if (!rowWidth || !size || size.width <= 0) return;
    const frame = frameForIndex(index, rowWidth, tabs.length, size);
    pillHeight.value = frame.height;
    pillOpacity.value = 1;

    if (animated) {
      // If we already know a previous frame, jump there first so remounts and
      // cold starts still glide from the last tab instead of from x=0.
      if (lastPillFrame.width > 0 && lastPillFrame.index !== index) {
        cancelAnimation(translateX);
        cancelAnimation(pillWidth);
        translateX.value = lastPillFrame.x;
        pillWidth.value = lastPillFrame.width;
      }
      translateX.value = withTiming(frame.x, GLIDE);
      pillWidth.value = withTiming(frame.width, GLIDE);
    } else {
      cancelAnimation(translateX);
      cancelAnimation(pillWidth);
      translateX.value = frame.x;
      pillWidth.value = frame.width;
    }
    lastPillFrame = { x: frame.x, width: frame.width, index };
  };

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    const size = innerSizes[visualIndex];
    if (!rowWidth || !size || size.width <= 0) return;

    // Already at this tab (e.g. remount after delayed nav) — snap, don't replay.
    // Skip while a press-glide is in flight (layout churn must not cancel withTiming).
    if (lastPillFrame.index === visualIndex && lastPillFrame.width > 0) {
      if (pendingKeyRef.current != null) return;
      movePillTo(visualIndex, false);
      return;
    }
    // Route changed without a local press (Find Match / deep link) — glide.
    movePillTo(visualIndex, lastPillFrame.width > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geometry / index only
  }, [visualIndex, rowWidth, innerSizes]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateX: translateX.value }],
    width: pillWidth.value,
    height: pillHeight.value || undefined,
  }));

  const onRowLayout = (e: LayoutChangeEvent) => {
    setRowWidth(e.nativeEvent.layout.width);
  };

  const onInnerLayout = (index: number, e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setInnerSizes((prev) => {
      const cur = prev[index];
      if (cur && cur.width === width && cur.height === height) return prev;
      const next = prev.slice();
      next[index] = { width, height };
      return next;
    });
  };

  const handlePress = (key: SlidingTabKey, index: number) => {
    if (index === visualIndex && pendingKeyRef.current == null) return;

    // Glide on this shell first — replace remounts AppShell and would kill
    // an in-flight animation if we navigated immediately.
    skipSyncRef.current = true;
    setVisualIndex(index);
    movePillTo(index, true);

    pendingKeyRef.current = key;
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      navTimerRef.current = null;
      pendingKeyRef.current = null;
      onPress(key);
    }, NAV_DELAY_MS);
  };

  return (
    <View style={[styles.row, style]} onLayout={onRowLayout}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pill, { backgroundColor: activeColor }, pillStyle]}
      />
      {tabs.map((tab, index) => {
        const isActive = index === visualIndex;
        return (
          <Pressable
            key={tab.key}
            testID={`bottom-nav-${tab.key}`}
            style={styles.tab}
            onPress={() => handlePress(tab.key, index)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.tabInner} onLayout={(e) => onInnerLayout(index, e)}>
              <Ionicons name={tab.icon} size={18} color={isActive ? themeColors.white : inactiveColor} />
              <Text style={[styles.label, { color: isActive ? themeColors.white : inactiveColor }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: 4,
    borderRadius: 12,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingVertical: 4,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 56,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
