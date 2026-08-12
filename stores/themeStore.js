import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  theme: 'default',
  mode: 'light',

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme === 'default' ? '' : theme);
    set({ theme });
  },

  setMode: (mode) => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ mode });
  },

  initTheme: (theme, mode) => {
    if (theme && theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    }
    set({ theme: theme || 'default', mode: mode || 'light' });
  },
}));
