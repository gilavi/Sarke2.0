/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        georgian: ['NotoSansGeorgian-Regular'],
      },
      colors: {
        accent: '#147A4F',
        'accent-soft': '#DDF0E7',
        warn: '#E08A1B',
        'warn-soft': '#FCEFD9',
        danger: '#C0433C',
        'danger-soft': '#FBE8E6',
        background: '#F6F2EA',
        card: '#FFFFFF',
        hairline: '#E8E1D4',
        'subtle-surface': '#EFEAE0',
        ink: '#1A1A1A',
        'ink-soft': '#4A4A4A',
        'ink-faint': 'rgba(74,74,74,0.6)',
      },
    },
  },
  plugins: [],
};
