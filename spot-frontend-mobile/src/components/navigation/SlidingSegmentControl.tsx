import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/colors';

const GLIDE = {
  duration: 280,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

export type SegmentItem<K extends string = string> = {
  key: K;
  label: string;
  testID?: string;
  /** Optional leading icon; receives whether this segment is active. */
  renderIcon?: (active: boolean) => React.ReactNode;
};

type Props<K extends string> = {
  items: SegmentItem<K>[];
  active: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  activeLabelStyle?: StyleProp<TextStyle>;
  inactiveColor?: string;
  activeColor?: string;
  pillColor?: string;
  /** Vertical padding inside each segment hit target. */
  segmentPaddingVertical?: number;
};

type Frame = { x: number; y: number; width: number; height: number };

/**
 * Equal-width segmented control with a sliding blue pill (sport toggle,
 * Matches/Groups/Tournaments, etc.). No navigation remount — glide runs
 * immediately on the same instance.
 */
export default function SlidingSegmentControl<K extends string>({
  items,
  active,
  onChange,
  style,
  labelStyle,
  activeLabelStyle,
  inactiveColor = colors.outline,
  activeColor = colors.white,
  pillColor = colors.primaryDark,
  segmentPaddingVertical = 12,
}: Props<K>) {
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === active)
  );
  const [frames, setFrames] = useState<Frame[]>(() =>
    items.map(() => ({ x: 0, y: 0, width: 0, height: 0 }))
  );

  const translateX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillHeight = useSharedValue(0);
  const pillTop = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  const movePillTo = (index: number, animated: boolean) => {
    const frame = frames[index];
    if (!frame || frame.width <= 0) return;
    pillHeight.value = frame.height;
    pillTop.value = frame.y;
    pillOpacity.value = 1;
    if (animated) {
      cancelAnimation(translateX);
      cancelAnimation(pillWidth);
      translateX.value = withTiming(frame.x, GLIDE);
      pillWidth.value = withTiming(frame.width, GLIDE);
    } else {
      cancelAnimation(translateX);
      cancelAnimation(pillWidth);
      translateX.value = frame.x;
      pillWidth.value = frame.width;
    }
  };

  useEffect(() => {
    movePillTo(activeIndex, pillOpacity.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, frames]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    top: pillTop.value,
    transform: [{ translateX: translateX.value }],
    width: pillWidth.value,
    height: pillHeight.value || undefined,
  }));

  const onSegmentLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setFrames((prev) => {
      const cur = prev[index];
      if (cur && cur.x === x && cur.y === y && cur.width === width && cur.height === height) {
        return prev;
      }
      const next = prev.slice();
      next[index] = { x, y, width, height };
      return next;
    });
  };

  return (
    <View style={[styles.track, style]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pill, { backgroundColor: pillColor }, pillStyle]}
      />
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={item.key}
            testID={item.testID}
            style={[styles.segment, { paddingVertical: segmentPaddingVertical }]}
            onLayout={(e) => onSegmentLayout(index, e)}
            onPress={() => {
              if (item.key === active) return;
              onChange(item.key);
            }}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
          >
            {item.renderIcon ? item.renderIcon(isActive) : null}
            <Text
              style={[
                styles.label,
                { color: isActive ? activeColor : inactiveColor },
                labelStyle,
                isActive && activeLabelStyle,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    gap: 6,
  },
  pill: {
    position: 'absolute',
    left: 0,
    borderRadius: 12,
    zIndex: 0,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
