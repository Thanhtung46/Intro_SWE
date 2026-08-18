import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  disabled?: boolean;
};

const THUMB_SIZE = 20;

/** Draggable dual-thumb range slider (no external slider dependency) — Figma node 72:327 ("Price Range"). */
export default function RangeSlider({ min, max, step = 10, value, onChange, disabled }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackPageX = useRef(0);
  const trackRef = useRef<View>(null);

  const valueToPercent = (v: number) => (v - min) / (max - min);
  const percentToValue = (p: number) => {
    const raw = min + p * (max - min);
    return Math.round(raw / step) * step;
  };

  const moveThumb = (thumb: 'min' | 'max') => (_evt: unknown, gesture: { moveX: number }) => {
    if (!trackWidth) return;
    const pos = Math.min(Math.max(gesture.moveX - trackPageX.current, 0), trackWidth);
    const next = percentToValue(pos / trackWidth);
    if (thumb === 'min') {
      onChange([Math.min(Math.max(next, min), value[1] - step), value[1]]);
    } else {
      onChange([value[0], Math.max(Math.min(next, max), value[0] + step)]);
    }
  };

  const minResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderMove: moveThumb('min'),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, trackWidth, value[0], value[1]],
  );
  const maxResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderMove: moveThumb('max'),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, trackWidth, value[0], value[1]],
  );

  const handleTrackLayout = () => {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      setTrackWidth(width);
      trackPageX.current = pageX;
    });
  };

  const minPercent = valueToPercent(value[0]) * 100;
  const maxPercent = valueToPercent(value[1]) * 100;

  return (
    <View style={[styles.wrap, disabled && styles.disabled]}>
      <View ref={trackRef} style={styles.track} onLayout={handleTrackLayout}>
        {!disabled && <View style={[styles.fill, { left: `${minPercent}%`, right: `${100 - maxPercent}%` }]} />}
      </View>
      {!disabled && (
        <>
          <View
            {...minResponder.panHandlers}
            style={[styles.thumb, { left: `${minPercent}%` }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          />
          <View
            {...maxResponder.panHandlers}
            style={[styles.thumb, { left: `${maxPercent}%` }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 44,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  track: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#E5EEFF',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    marginLeft: -THUMB_SIZE / 2,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
