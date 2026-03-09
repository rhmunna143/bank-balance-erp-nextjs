import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  theme: 'default',

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme === 'default' ? '' : theme);
    set({ theme });
  },

  initTheme: (theme) => {
    if (theme && theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme: theme || 'default' });
  },
}));
