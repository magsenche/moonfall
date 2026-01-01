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
      <body className="font-sans antialiased bg-slate-950 text-white min-h-screen">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error illustration */}
            <div className="text-6xl mb-4">🐺💥</div>
            
            <h1 className="text-2xl font-bold text-white">
              Oups, une erreur est survenue !
            </h1>
            
            <p className="text-slate-400">
              Quelque chose s&apos;est mal passé. Notre équipe a été notifiée.
            </p>

            {/* Error ID for support */}
            {error.digest && (
              <p className="text-xs text-slate-500 font-mono">
                ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl border-2 border-violet-400 shadow-[4px_4px_0_0_rgba(139,92,246,0.3)] hover:shadow-[2px_2px_0_0_rgba(139,92,246,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                🔄 Réessayer
              </button>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border-2 border-slate-600 shadow-[4px_4px_0_0_rgba(100,116,139,0.3)] hover:shadow-[2px_2px_0_0_rgba(100,116,139,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                🏠 Accueil
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
