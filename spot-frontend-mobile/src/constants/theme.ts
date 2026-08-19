import { colors } from './colors';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceBorder: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  white: string;
  error: string;
}

export const lightTheme: ThemeColors = {
  background: colors.formScreenBackground,
  surface: colors.white,
  surfaceBorder: 'transparent',
  divider: colors.border,
  textPrimary: colors.text,
  textSecondary: colors.subtitle,
  textMuted: colors.placeholder,
  primary: colors.primaryDark,
  white: colors.white,
  error: colors.formError,
};

// Lấy từ Figma "SettingsDark" (node 199:3786) qua Dev Mode MCP —
// Aura Sports: Elite Dark palette.
export const darkTheme: ThemeColors = {
  background: '#0C1324',
  surface: 'rgba(25, 31, 49, 0.85)',
  surfaceBorder: 'rgba(66, 71, 84, 0.5)',
  divider: 'rgba(66, 71, 84, 0.4)',
  textPrimary: '#DCE1FB',
  textSecondary: '#8C909F',
  textMuted: '#8C909F',
  primary: '#4D8EFF',
  white: '#FFFFFF',
  error: '#FFB4AB',
};
