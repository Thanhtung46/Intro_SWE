import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/context/ThemeContext';

export function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}
