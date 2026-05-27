import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — mirrors mobile primary scale (lib/theme.ts).
        brand: {
          50: '#E8F5F0',
          100: '#D1EBE1',
          200: '#A3D7C3',
          300: '#75C3A5',
          400: '#47AF87',
          500: '#147A4F',
          600: '#106240',
          700: '#0C4930',
          800: '#083120',
          900: '#041810',
          950: '#020A07',
        },
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 0 1px rgba(20,122,79,0.06), 0 1px 2px rgba(20,122,79,0.04)',
        'glow-md': '0 0 0 1px rgba(20,122,79,0.08), 0 2px 8px rgba(20,122,79,0.06), 0 4px 16px rgba(20,122,79,0.03)',
        'glow-lg': '0 0 0 1px rgba(20,122,79,0.10), 0 4px 12px rgba(20,122,79,0.08), 0 8px 24px rgba(20,122,79,0.04)',
        'glow-dark-sm': '0 0 0 1px rgba(71,175,135,0.10), 0 0 8px rgba(71,175,135,0.06)',
        'glow-dark-md': '0 0 0 1px rgba(71,175,135,0.15), 0 0 16px rgba(71,175,135,0.12), 0 0 32px rgba(71,175,135,0.06)',
        'glow-dark-lg': '0 0 0 1px rgba(71,175,135,0.20), 0 0 24px rgba(71,175,135,0.18), 0 0 48px rgba(71,175,135,0.10)',
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
