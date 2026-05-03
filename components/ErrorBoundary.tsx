import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { captureException } from '../lib/crashReporting';
import { a11y } from '../lib/accessibility';
import { useTheme } from '../lib/theme';


interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function FallbackUI({ error, onReset }: { error?: Error; onReset: () => void }) {
  const { theme } = useTheme();
  const styles = getstyles(theme);
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💥</Text>
      <Text style={styles.title}>რაღაც შეცდომა მოხდა</Text>
      <Text style={styles.subtitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{error?.message}</Text>
      <Pressable style={styles.button} onPress={onReset} {...a11y('თავიდან ცდა', 'შეეხეთ აპლიკაციის თავიდან ჩატვირთვისთვის', 'button')}>
        <Text style={styles.buttonText}>თავიდან ცდა / Retry</Text>
      </Pressable>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureException(error, { componentStack: errorInfo.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <FallbackUI error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

function getstyles(theme: any) {
  return StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, color: theme.colors.inkSoft, marginBottom: 16 },
  errorText: { fontSize: 12, color: theme.colors.semantic.danger, marginBottom: 24, textAlign: 'center' },
  button: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
}
