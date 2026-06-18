import React from 'react';
import type { Preview } from '@storybook/react-native-web-vite';
import { ThemeContext } from '@root/lib/ThemeContext';
import { lightTheme, darkTheme, type Theme } from '@root/lib/theme';

/** Controlled theme provider for Storybook — drives the real ThemeContext from
 *  the toolbar so light/dark switches deterministically (no AsyncStorage). */
function StorybookThemeProvider({ mode, children }: { mode: 'light' | 'dark'; children: React.ReactNode }) {
  const isDark = mode === 'dark';
  const theme: Theme = isDark ? darkTheme : (lightTheme as Theme);
  const value = { theme, isDark, mode, setMode: () => {} };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    layout: 'fullscreen',
    options: {
      storySort: { order: ['Tokens', 'Universal', '*'] },
    },
  },
  globalTypes: {
    theme: {
      description: 'Color scheme',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const mode = (ctx.globals.theme as 'light' | 'dark') || 'dark';
      const bg = mode === 'dark' ? '#000000' : '#FFFFFF';
      return (
        <StorybookThemeProvider mode={mode}>
          <div style={{ padding: 32, background: bg, minHeight: '100vh', boxSizing: 'border-box' }}>
            <Story />
          </div>
        </StorybookThemeProvider>
      );
    },
  ],
};

export default preview;
