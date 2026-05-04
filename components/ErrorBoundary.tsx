import React, { Component, ReactNode } from 'react';
import { router } from 'expo-router';
import { captureException } from '../lib/crashReporting';
import { ErrorScreen } from './ErrorScreen';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

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

  handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    router.replace('/(tabs)/home');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorScreen
          onRetry={this.handleReset}
          onGoHome={this.handleGoHome}
        />
      );
    }
    return this.props.children;
  }
}
