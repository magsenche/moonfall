import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Performance monitoring (lower on server to reduce overhead)
  tracesSampleRate: 0.05, // 5% of transactions
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Filter out noisy errors
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],
});
