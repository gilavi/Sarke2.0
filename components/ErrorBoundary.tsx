import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../lib/theme';
import { logError } from '../lib/logError';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

function ErrorRedirect({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  React.useEffect(() => {
    router.replace('/(tabs)/home');
    onDone();
  }, [router, onDone]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.ink }}>
        რაღაც არ გამოვიდა
      </Text>
      <Text style={{ color: theme.colors.inkSoft, textAlign: 'center', lineHeight: 22 }}>
        გადამისამართება მთავარ გვერდზე...
      </Text>
    </View>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    logError(error, `ErrorBoundary${info.componentStack ? ':' + info.componentStack.split('\n')[1]?.trim() : ''}`);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorRedirect onDone={this.reset} />;
  }
}
