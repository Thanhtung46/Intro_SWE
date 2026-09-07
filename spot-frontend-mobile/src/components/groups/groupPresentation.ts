import type { ThemeColors } from '@/constants/theme';
import type { TranslationKey } from '@/i18n/translations';
import type { Sport } from '@/types/match';

type Translate = (key: TranslationKey) => string;

const SKILL_KEYS: Record<string, TranslationKey> = {
  LEARNING: 'groups.skill.labels.LEARNING', REC_BASIC: 'groups.skill.labels.REC_BASIC',
  REC_ADVANCED: 'groups.skill.labels.REC_ADVANCED', SEMI_PRO: 'groups.skill.labels.SEMI_PRO',
  PROFESSIONAL: 'groups.skill.labels.PROFESSIONAL', ELITE: 'groups.skill.labels.ELITE',
  BEGINNER_MINUS: 'groups.skill.labels.BEGINNER_MINUS', BEGINNER: 'groups.skill.labels.BEGINNER',
  BEGINNER_PLUS: 'groups.skill.labels.BEGINNER_PLUS', LOW_AVERAGE: 'groups.skill.labels.LOW_AVERAGE',
  AVERAGE_MINUS: 'groups.skill.labels.AVERAGE_MINUS', AVERAGE: 'groups.skill.labels.AVERAGE',
  AVERAGE_PLUS: 'groups.skill.labels.AVERAGE_PLUS', FAIR: 'groups.skill.labels.FAIR',
};

export function groupSkillLabel(t: Translate, code: string | null | undefined): string | null {
  if (!code) return null;
  const key = SKILL_KEYS[code];
  return key ? t(key) : code;
}

export function groupSkillTier(colors: ThemeColors, sport: Sport, code: string | null | undefined) {
  const footballOrder = ['LEARNING', 'REC_BASIC', 'REC_ADVANCED', 'SEMI_PRO', 'PROFESSIONAL', 'ELITE'];
  const badmintonOrder = ['BEGINNER_MINUS', 'BEGINNER', 'BEGINNER_PLUS', 'LOW_AVERAGE', 'AVERAGE_MINUS', 'AVERAGE', 'AVERAGE_PLUS', 'FAIR', 'SEMI_PRO', 'PROFESSIONAL'];
  const order = sport === 'FOOTBALL' ? footballOrder : badmintonOrder;
  const rank = Math.max(0, order.indexOf(code ?? ''));
  const ratio = order.length <= 1 ? 0 : rank / (order.length - 1);
  if (ratio <= 0.33) return { bg: colors.successSurface, border: colors.successBorder, text: colors.successText };
  if (ratio <= 0.66) return { bg: colors.warningSurface, border: colors.warningText, text: colors.warningText };
  return { bg: colors.dangerSurface, border: colors.error, text: colors.error };
}
