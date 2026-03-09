import { useThemeStore } from '@/stores/themeStore';

export function useTheme() {
  const { theme, setTheme, initTheme } = useThemeStore();
  return { theme, setTheme, initTheme };
}
