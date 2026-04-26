/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#147A4F',
        accent: '#147A4F',
        'accent-soft': '#DDF0E7',
        background: '#F6F2EA',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        hairline: '#E8E1D4',
        'subtle-surface': '#EFEAE0',
        ink: '#1A1A1A',
        'ink-soft': '#4A4A4A',
        'ink-faint': 'rgba(74,74,74,0.6)',
        danger: '#C0433C',
        'danger-soft': '#FBE8E6',
        warn: '#E08A1B',
        'warn-soft': '#FCEFD9',
        white: '#FFFFFF',
        'harness-tint': '#2B5F9E',
        'harness-soft': '#DCE8F5',
        'cert-tint': '#B45309',
        'cert-soft': '#FDEBCF',
        'regs-tint': '#5D3FD3',
        'regs-soft': '#E5DFF9',
      },
      fontFamily: {
        georgian: ['NotoSansGeorgian-Regular', 'NotoSansGeorgian-Bold'],
      },
    },
  },
  plugins: [],
};
