import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const isEnabled = !__DEV__ && !!SENTRY_DSN;

export function initCrashReporting() {
  if (!isEnabled) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
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
