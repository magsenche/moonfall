import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Performance monitoring for edge functions
  tracesSampleRate: 0.05,
  
  // Environment
  environment: process.env.NODE_ENV,
});
