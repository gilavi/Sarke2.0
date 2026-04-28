import type { Config } from 'tailwindcss';

export default {
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
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
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
