import { defaultTheme } from './defaultTheme';
import { bankAsiaTheme } from './bankAsiaTheme';

export const themes = {
  default: defaultTheme,
  'bank-asia': bankAsiaTheme,
};

export function getTheme(themeId) {
  return themes[themeId] || defaultTheme;
}

export function getThemeList() {
  return Object.values(themes);
}
