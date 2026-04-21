// Design tokens for the Sarke app.
export const theme = {
  colors: {
    accent: '#147A4F',
    accentSoft: '#DDF0E7',
    warn: '#E08A1B',
    warnSoft: '#FCEFD9',
    danger: '#C0433C',
    dangerSoft: '#FBE8E6',
    background: '#F6F2EA',
    card: '#FFFFFF',
    hairline: '#E8E1D4',
    subtleSurface: '#EFEAE0',
    ink: '#1A1A1A',
    inkSoft: '#4A4A4A',
    inkFaint: 'rgba(74,74,74,0.6)',
    white: '#FFFFFF',
    harnessTint: '#2B5F9E',
    harnessSoft: '#DCE8F5',
    templatesTint: '#2B5F9E',
    templatesSoft: '#DCE8F5',
    certTint: '#B45309',
    certSoft: '#FDEBCF',
    regsTint: '#5D3FD3',
    regsSoft: '#E5DFF9',
  },
  radius: { sm: 10, md: 14, lg: 18, pill: 999 },
  spacing: (n: number) => n * 4,
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 3,
    },
    button: {
      shadowColor: '#147A4F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  text: {
    display: (size: number, weight: '400' | '500' | '600' | '700' | '800' | '900' = '700') => ({
      fontSize: size,
      fontWeight: weight,
      fontFamily:
        // Use SF Rounded on iOS for that rounded-display feel; fall back on Android.
        'System',
    }),
  },
} as const;

export type Theme = typeof theme;
