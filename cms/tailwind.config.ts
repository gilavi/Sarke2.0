import type { Config } from 'tailwindcss';

// Brand orange mirrors web-app/tailwind.config.ts so the CMS feels like part of
// Hubble. No shadows — separation comes from borders + backgrounds.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF3EE',
          100: '#FFE2D5',
          200: '#FFC4AC',
          300: '#FF9E78',
          400: '#FF7A47',
          500: '#FF5A1F',
          600: '#E8470F',
          700: '#C03A0D',
          800: '#962F0E',
          900: '#7A2A10',
          950: '#421305',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
