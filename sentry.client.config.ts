import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Session replay (optional, can be heavy)
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 0.1, // 10% of sessions with errors
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors (user's connection issues)
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User cancelled
    'AbortError',
  ],
  
  // Add context to errors
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    return event;
  },
});
