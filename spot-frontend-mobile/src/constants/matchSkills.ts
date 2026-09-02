import { colors } from '@/constants/colors';
import type { Sport } from '@/types/match';

// Mirrors spot-backend/src/shared/constants/sports.js's SKILLS_BY_SPORT
// (code + rank) — keep the codes/order in sync with that file if it changes.
// The *labels* here are NOT copied from sports.js: that file's internal
// label ("Learning", "Rec basic", "Pro", ...) is backend-facing, while
// Figma's Filter sheet (node 87:1903, SPOT-76 plan mục 1) shows different
// user-facing copy for Football ("Beginner", "Basic Amateur", ... —
// confirmed via Figma MCP). Badminton chips aren't in Figma yet (plan
// mục 4, open question) — falls back to spot-backend's raw label until
// confirmed.
const FOOTBALL_SKILLS: { code: string; rank: number; label: string }[] = [
  { code: 'LEARNING', rank: 1, label: 'Beginner' },
  { code: 'REC_BASIC', rank: 2, label: 'Basic Amateur' },
  { code: 'REC_ADVANCED', rank: 3, label: 'Advanced Amateur' },
  { code: 'SEMI_PRO', rank: 4, label: 'Semi-pro' },
  { code: 'PROFESSIONAL', rank: 5, label: 'Professional' },
  { code: 'ELITE', rank: 6, label: 'Elite' },
];

const BADMINTON_SKILLS: { code: string; rank: number; label: string }[] = [
  { code: 'BEGINNER_MINUS', rank: 1, label: 'Beginner-' },
  { code: 'BEGINNER', rank: 2, label: 'Beginner' },
  { code: 'BEGINNER_PLUS', rank: 3, label: 'Beginner+' },
  { code: 'LOW_AVERAGE', rank: 4, label: 'Low Avg' },
  { code: 'AVERAGE_MINUS', rank: 5, label: 'Avg-' },
  { code: 'AVERAGE', rank: 6, label: 'Avg' },
  { code: 'AVERAGE_PLUS', rank: 7, label: 'Avg+' },
  { code: 'FAIR', rank: 8, label: 'Fair' },
  { code: 'SEMI_PRO', rank: 9, label: 'Semi-pro' },
  { code: 'PROFESSIONAL', rank: 10, label: 'Pro' },
];

export type SkillOption = { code: string; rank: number; label: string };

export function skillsForSport(sport: Sport): SkillOption[] {
  return sport === 'FOOTBALL' ? FOOTBALL_SKILLS : BADMINTON_SKILLS;
}

export function skillLabel(sport: Sport, code: string | null | undefined): string | null {
  if (!code) return null;
  return skillsForSport(sport).find((item) => item.code === code)?.label ?? code;
}

export type SkillTierColor = { bg: string; border: string; text: string };

const TIER_GREEN: SkillTierColor = {
  bg: colors.skillTierGreenBg,
  border: colors.skillTierGreenBorder,
  text: colors.skillTierGreenText,
};
const TIER_ORANGE: SkillTierColor = {
  bg: colors.skillTierOrangeBg,
  border: colors.skillTierOrangeBorder,
  text: colors.skillTierOrangeText,
};
const TIER_RED: SkillTierColor = {
  bg: colors.skillTierRedBg,
  border: colors.skillTierRedBorder,
  text: colors.skillTierRedText,
};

// Buckets a skill's rank (1-based) within its sport's tier count into a
// green -> orange -> red scale — Figma's card badges use this progression
// but don't map every tier 1:1 to a color, so this is a reasonable stand-in.
export function skillTierColor(sport: Sport, code: string | null | undefined): SkillTierColor {
  const skills = skillsForSport(sport);
  const item = skills.find((entry) => entry.code === code);
  if (!item) return TIER_GREEN;
  const ratio = skills.length <= 1 ? 0 : (item.rank - 1) / (skills.length - 1);
  if (ratio <= 0.33) return TIER_GREEN;
  if (ratio <= 0.66) return TIER_ORANGE;
  return TIER_RED;
}
