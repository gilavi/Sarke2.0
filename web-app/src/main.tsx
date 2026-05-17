import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from '@/lib/theme';
import '@/lib/i18n';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </ThemeProvider>,
);
