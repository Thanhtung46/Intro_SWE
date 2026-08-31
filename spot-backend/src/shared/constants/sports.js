export const SPORTS = Object.freeze({
  BADMINTON: 'BADMINTON',
  FOOTBALL: 'FOOTBALL',
});

export const SPORT_CODES = Object.freeze([SPORTS.BADMINTON, SPORTS.FOOTBALL]);

/** JSON keys on public user.skills (lowercase). */
export const SPORT_JSON_KEYS = Object.freeze({
  [SPORTS.BADMINTON]: 'badminton',
  [SPORTS.FOOTBALL]: 'football',
});

export const BADMINTON_SKILLS = Object.freeze([
  { rank: 1, code: 'BEGINNER_MINUS', label: 'Beginner-', vn: 'Yếu-' },
  { rank: 2, code: 'BEGINNER', label: 'Beginner', vn: 'Yếu' },
  { rank: 3, code: 'BEGINNER_PLUS', label: 'Beginner+', vn: 'Yếu+' },
  { rank: 4, code: 'LOW_AVERAGE', label: 'Low avg', vn: 'Trung bình yếu' },
  { rank: 5, code: 'AVERAGE_MINUS', label: 'Avg-', vn: 'Trung bình-' },
  { rank: 6, code: 'AVERAGE', label: 'Avg', vn: 'Trung bình' },
  { rank: 7, code: 'AVERAGE_PLUS', label: 'Avg+', vn: 'Trung bình+' },
  { rank: 8, code: 'FAIR', label: 'Fair', vn: 'Khá' },
  { rank: 9, code: 'SEMI_PRO', label: 'Semi-pro', vn: 'Bán chuyên' },
  { rank: 10, code: 'PROFESSIONAL', label: 'Pro', vn: 'Chuyên nghiệp' },
]);

export const FOOTBALL_SKILLS = Object.freeze([
  { rank: 1, code: 'LEARNING', label: 'Learning', vn: 'Tập chơi' },
  { rank: 2, code: 'REC_BASIC', label: 'Rec basic', vn: 'Phong trào cơ bản' },
  { rank: 3, code: 'REC_ADVANCED', label: 'Rec advanced', vn: 'Phong trào nâng cao' },
  { rank: 4, code: 'SEMI_PRO', label: 'Semi-pro', vn: 'Bán chuyên' },
  { rank: 5, code: 'PROFESSIONAL', label: 'Pro', vn: 'Chuyên nghiệp' },
  { rank: 6, code: 'ELITE', label: 'Elite', vn: 'Đỉnh cao' },
]);

export const SKILLS_BY_SPORT = Object.freeze({
  [SPORTS.BADMINTON]: BADMINTON_SKILLS,
  [SPORTS.FOOTBALL]: FOOTBALL_SKILLS,
});

export const BADMINTON_SKILL_CODES = Object.freeze(
  BADMINTON_SKILLS.map((s) => s.code),
);

export const FOOTBALL_SKILL_CODES = Object.freeze(
  FOOTBALL_SKILLS.map((s) => s.code),
);

export function skillCodesForSport(sport) {
  return SKILLS_BY_SPORT[sport]?.map((s) => s.code) ?? [];
}

export function isSkillForSport(sport, code) {
  return skillCodesForSport(sport).includes(code);
}

export function rankForSkill(sport, code) {
  const item = SKILLS_BY_SPORT[sport]?.find((s) => s.code === code);
  return item ? item.rank : null;
}

export function emptySkills() {
  return {
    badminton: null,
    football: null,
  };
}
