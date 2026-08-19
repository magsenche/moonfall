'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Global Error Page
 * 
 * Shown when an unhandled error occurs in the app.
 * Automatically reports to Sentry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased bg-night-950 text-white min-h-screen">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error illustration */}
            <div className="text-6xl mb-4">🐺💥</div>
            
            <h1 className="text-2xl font-bold text-white">
              Oups, une erreur est survenue !
            </h1>
            
            <p className="text-moon-100/50">
              Quelque chose s&apos;est mal passé. Notre équipe a été notifiée.
            </p>

            {/* Error ID for support */}
            {error.digest && (
              <p className="text-xs text-moon-100/40 font-mono">
                ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-3 bg-moon-500 hover:bg-moon-300 text-night-950 font-semibold rounded-xl border-2 border-moon-100 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Réessayer
              </button>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-night-800 hover:bg-night-700 text-white font-semibold rounded-xl border-2 border-night-600 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Accueil
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
