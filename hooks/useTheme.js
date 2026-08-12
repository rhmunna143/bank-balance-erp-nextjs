import { useThemeStore } from '@/stores/themeStore';

export function useTheme() {
  const { theme, setTheme, mode, setMode, initTheme } = useThemeStore();
  return { theme, setTheme, mode, setMode, initTheme };
}
