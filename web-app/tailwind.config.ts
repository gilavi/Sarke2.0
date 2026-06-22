import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette - Safety Orange, unified with mobile (lib/theme.ts)
        // and the marketing landing page.
        brand: {
          50: '#FFF3EE',
          100: '#FFE3D6',
          200: '#FFC4AC',
          300: '#FF9E78',
          400: '#FF7A47',
          500: '#FF5A1F',
          600: '#E84709',
          700: '#BE380C',
          800: '#972F11',
          900: '#7B2913',
          950: '#421106',
        },
        // ─── Hubble brand board (marketing site) ───────────────────────────
        // SAFETY ORANGE #FF5A1F - primary action / accent (scale around it).
        safety: {
          50: '#FFF3EE',
          100: '#FFE3D6',
          200: '#FFC4AC',
          300: '#FF9E78',
          400: '#FF7A47',
          500: '#FF5A1F',
          600: '#E84709',
          700: '#BE380C',
          800: '#972F11',
          900: '#7B2913',
          950: '#421106',
        },
        // HI-VIS YELLOW #E6FF4D - high-energy spotlight (numbers, sticker pills).
        hivis: {
          DEFAULT: '#E6FF4D',
          300: '#EEFF85',
          400: '#E6FF4D',
          500: '#D2F500',
          600: '#A8C400',
          700: '#7E9300',
        },
        // GRAPHITE #1A1A1A - dark sections + ink (warm near-black scale).
        graphite: {
          DEFAULT: '#1A1A1A',
          400: '#6E6E66',
          500: '#52524C',
          600: '#3A3A36',
          700: '#2A2A27',
          800: '#1E1E1C',
          900: '#161614',
          950: '#0D0D0C',
        },
        offwhite: '#F2F1EC', // OFF-WHITE - warm page background
        concrete: '#D6D6D1', // CONCRETE - borders / muted text on dark
        neutral: {
          50: '#FAFAF8',
          100: '#F5F5F0',
          200: '#E8E6E0',
          300: '#D4D0C8',
          400: '#A8A49C',
          500: '#7C7870',
          600: '#504C44',
          700: '#3A3630',
          800: '#242018',
          900: '#0E0C08',
        },
        danger: '#EF4444',
      },
      fontSize: {
        'heading-1': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-2': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-3': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 0 1px rgba(255,90,31,0.06), 0 1px 2px rgba(255,90,31,0.04)',
        'glow-md': '0 0 0 1px rgba(255,90,31,0.08), 0 2px 8px rgba(255,90,31,0.06), 0 4px 16px rgba(255,90,31,0.03)',
        'glow-lg': '0 0 0 1px rgba(255,90,31,0.10), 0 4px 12px rgba(255,90,31,0.08), 0 8px 24px rgba(255,90,31,0.04)',
        'glow-dark-sm': '0 0 0 1px rgba(255,122,71,0.10), 0 0 8px rgba(255,122,71,0.06)',
        'glow-dark-md': '0 0 0 1px rgba(255,122,71,0.15), 0 0 16px rgba(255,122,71,0.12), 0 0 32px rgba(255,122,71,0.06)',
        'glow-dark-lg': '0 0 0 1px rgba(255,122,71,0.20), 0 0 24px rgba(255,122,71,0.18), 0 0 48px rgba(255,122,71,0.10)',
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
} satisfies Config;
