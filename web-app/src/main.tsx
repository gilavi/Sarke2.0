import '@mantine/core/styles.css';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from '@/lib/theme';
import '@/lib/i18n';
import './index.css';
import App from './App';

const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: [
      '#E8F5F0', // 0
      '#D1EBE1', // 1
      '#A3D7C3', // 2
      '#75C3A5', // 3
      '#47AF87', // 4
      '#147A4F', // 5  ← primaryShade light
      '#106240', // 6
      '#0C4930', // 7
      '#083120', // 8
      '#041810', // 9
    ],
  },
  primaryShade: { light: 5, dark: 4 },
  fontFamily: 'Inter, system-ui, sans-serif',
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: { radius: 'md' },
    },
    TextInput: {
      defaultProps: { radius: 'md' },
    },
    Select: {
      defaultProps: { radius: 'md' },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme}>
    <ThemeProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </MantineProvider>,
);
