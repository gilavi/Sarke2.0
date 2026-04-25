import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { theme } from '../lib/theme';
import { logError } from '../lib/logError';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

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
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: 24,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.ink }}>
          რაღაც არ გამოვიდა
        </Text>
        <Text style={{ color: theme.colors.inkSoft, textAlign: 'center', lineHeight: 22 }}>
          აპლიკაციაში მოხდა მოულოდნელი შეცდომა. სცადეთ თავიდან.
        </Text>
        {__DEV__ ? (
          <Text style={{ color: theme.colors.danger, fontSize: 12, textAlign: 'center' }}>
            {this.state.error.message}
          </Text>
        ) : null}
        <Pressable
          onPress={this.reset}
          style={{
            backgroundColor: theme.colors.accent,
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.colors.white, fontWeight: '700' }}>კვლავ ცდა</Text>
        </Pressable>
      </View>
    );
  }
}
