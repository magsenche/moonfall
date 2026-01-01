import * as Sentry from '@sentry/nextjs';

/**
 * Instrumentation file for Next.js
 * 
 * This runs once when the server starts and initializes Sentry
 * for server-side error tracking.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
