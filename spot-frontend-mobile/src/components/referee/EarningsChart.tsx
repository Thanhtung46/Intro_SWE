import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { formatCompactVnd } from '@/utils/refereeFormat';

export type EarningsChartDatum = {
  key: string;
  label: string;
  amountVnd: number;
  /** period hasn't started yet — drawn as an empty slot (no stub, no value). */
  future?: boolean;
};

type Props = {
  data: EarningsChartDatum[];
  /** key of the bar for the current week/month — drawn in the accent colour. */
  currentKey?: string;
  height?: number;
};

const PAD = { top: 18, bottom: 22, left: 42, right: 10 };
const TICKS = 4; // → 5 gridlines / y-labels (0 … max)

/** Round a max value up to a "nice" 1/2/5 × 10ⁿ number; 0-safe. */
function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 100_000;
  const pow = 10 ** Math.floor(Math.log10(max));
  const norm = max / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Presentational SVG bar chart for the referee Earnings "Performance Growth"
 * card. Caller supplies fully-resolved buckets (zero-filled, labelled) — this
 * only draws. No touch handling; the current period's bar just uses the accent
 * colour.
 */
export default function EarningsChart({ data, currentKey, height = 210 }: Props) {
  const { t } = useLanguage();
  const [width, setWidth] = useState(0);

  if (data.length === 0) {
    return <Text style={styles.empty}>{t('referee.earnings.emptyChart')}</Text>;
  }

  const maxAmount = Math.max(0, ...data.map((d) => d.amountVnd));
  const top = niceMax(maxAmount);

  const plotTop = PAD.top;
  const plotBottom = height - PAD.bottom;
  const plotH = plotBottom - plotTop;
  const plotLeft = PAD.left;
  const plotRight = Math.max(plotLeft + 1, width - PAD.right);
  const plotW = plotRight - plotLeft;

  const slot = plotW / data.length;
  const barW = Math.min(slot * 0.44, 28);
  const yFor = (v: number) => plotBottom - (v / top) * plotH;
  const xCenter = (i: number) => plotLeft + slot * i + slot / 2;

  const currentIdx = currentKey ? data.findIndex((d) => d.key === currentKey) : -1;

  return (
    <View
      testID="earnings-chart"
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* gridlines + y-axis labels */}
          {Array.from({ length: TICKS + 1 }, (_, i) => {
            const value = (top / TICKS) * i;
            const y = yFor(value);
            return (
              <React.Fragment key={`grid-${i}`}>
                <Line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke={colors.border} strokeWidth={1} />
                <SvgText
                  x={plotLeft - 6}
                  y={y + 3}
                  fontSize={9}
                  fill={colors.subtitle}
                  textAnchor="end"
                >
                  {i === 0 ? '0' : formatCompactVnd(value)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* bars — an elapsed period with no earnings draws a flat stub on the
              baseline; a period that hasn't started yet is left as an empty slot.
              The selected period is the bright accent colour (stub or bar). */}
          {data.map((d, i) => {
            const isCurrent = i === currentIdx;
            const isZero = d.amountVnd <= 0;
            const h = d.future ? 0 : isZero ? 3 : Math.max(2, plotBottom - yFor(d.amountVnd));
            const fill = d.future
              ? 'transparent'
              : isCurrent
                ? colors.primary
                : colors.primaryDisabled;
            return (
              <Rect
                key={`bar-${d.key}`}
                testID={`earnings-bar-${d.key}`}
                x={xCenter(i) - barW / 2}
                y={plotBottom - h}
                width={barW}
                height={h}
                rx={isZero ? 1.5 : 4}
                fill={fill}
              />
            );
          })}

          {/* value label — elapsed periods only; empty ones show 0k */}
          {data.map((d, i) => {
            if (d.future) return null;
            const isZero = d.amountVnd <= 0;
            return (
              <SvgText
                key={`val-${d.key}`}
                x={xCenter(i)}
                y={isZero ? plotBottom - 8 : yFor(d.amountVnd) - 5}
                fontSize={9}
                fill={colors.subtitle}
                textAnchor="middle"
              >
                {isZero ? '0k' : formatCompactVnd(d.amountVnd)}
              </SvgText>
            );
          })}

          {/* x-axis period labels */}
          {data.map((d, i) => (
            <SvgText
              key={`lbl-${d.key}`}
              x={xCenter(i)}
              y={height - 7}
              fontSize={9}
              fill={colors.subtitle}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          ))}

        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  empty: { fontSize: 13, color: colors.subtitle, paddingVertical: spacing.sm },
});
