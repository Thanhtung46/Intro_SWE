import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';

export type SlidingTabKey = 'home' | 'booking' | 'matches' | 'schedule' | 'settings';

export type SlidingTab = {
  key: SlidingTabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const GLIDE = {
  duration: 320,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

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
 * Rendered once as `Tabs`' `tabBar` prop (AppTabBar) — this component now
 * stays mounted for the app's whole session (tab switches no longer
 * remount it, per specs/002-tab-navigation-performance), so the pill glide
 * is a plain animated transition to the newly-active tab's frame; no
 * cross-remount survival trick is needed anymore (the previous version's
 * module-level `lastPillFrame` + artificial navigation delay existed
 * specifically to fake continuity across a remount that this feature's fix
 * eliminates).
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
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === active));
  const [rowWidth, setRowWidth] = useState(0);
  const [innerSizes, setInnerSizes] = useState<{ width: number; height: number }[]>(() =>
    tabs.map(() => ({ width: 0, height: 0 }))
  );
  // Distinguishes "first time we have enough layout info to place the pill"
  // (must snap, not glide in from the edge) from later index changes (must
  // glide) — without this, the very first layout after mount would animate
  // the pill in from translateX=0 instead of appearing already in place.
  const hasPositionedRef = useRef(false);

  const translateX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillHeight = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  const movePillTo = (index: number, animated: boolean) => {
    const size = innerSizes[index];
    if (!rowWidth || !size || size.width <= 0) return;
    const frame = frameForIndex(index, rowWidth, tabs.length, size);
    pillHeight.value = frame.height;
    pillOpacity.value = 1;

    if (animated) {
      translateX.value = withTiming(frame.x, GLIDE);
      pillWidth.value = withTiming(frame.width, GLIDE);
    } else {
      translateX.value = frame.x;
      pillWidth.value = frame.width;
    }
    hasPositionedRef.current = true;
  };

  useEffect(() => {
    movePillTo(activeIndex, hasPositionedRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geometry / index only
  }, [activeIndex, rowWidth, innerSizes]);

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

  return (
    <View style={[styles.row, style]} onLayout={onRowLayout}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pill, { backgroundColor: activeColor }, pillStyle]}
      />
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={tab.key}
            testID={`bottom-nav-${tab.key}`}
            style={styles.tab}
            onPress={() => onPress(tab.key)}
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
