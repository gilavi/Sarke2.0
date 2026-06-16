import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
// Tag events with the active tier (development | staging | production) so
// staging noise never pollutes the production issue stream. Sourced from the
// env-driven app.config.ts `extra.appEnv`; defaults to production (fail-safe).
const APP_ENV = (Constants.expoConfig?.extra?.appEnv as string) || 'production';
const isEnabled = !__DEV__ && !!SENTRY_DSN;

export function initCrashReporting() {
  if (!isEnabled) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    beforeSend: (event) => {
      if (event.exception?.values) {
        event.exception.values.forEach((v) => {
          if (v.stacktrace?.frames) {
            v.stacktrace.frames.forEach((f) => {
              delete (f as any).vars;
            });
          }
        });
      }
      return event;
    },
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (!isEnabled) {
    console.error('[CrashReporting]', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!isEnabled) {
    console.log('[CrashReporting]', message);
    return;
  }
  Sentry.captureMessage(message, level);
}
