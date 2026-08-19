'use client';

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { MotionButton } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary - Catches React errors and displays a friendly fallback UI
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Send to Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-night-950 p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error illustration */}
            <div className="text-6xl mb-4">🐺💥</div>
            
            <h1 className="text-2xl font-bold text-white">
              Oups, quelque chose s&apos;est mal passé !
            </h1>
            
            <p className="text-moon-100/50">
              Une erreur inattendue est survenue. Les loups-garous n&apos;y sont pour rien (normalement).
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-night-900 rounded-lg p-4 text-sm">
                <summary className="cursor-pointer text-blood-400 font-medium">
                  Détails de l&apos;erreur
                </summary>
                <pre className="mt-2 text-moon-100/70 overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <MotionButton
                variant="sticker"
                onClick={this.handleRetry}
                className="bg-moon-500 border-moon-100 text-night-950 hover:bg-moon-300"
              >
                Réessayer
              </MotionButton>
              
              <MotionButton
                variant="sticker"
                onClick={this.handleReload}
                className="bg-night-700 hover:bg-night-600"
              >
                Recharger la page
              </MotionButton>
            </div>

            <p className="text-xs text-moon-100/40">
              Si le problème persiste, essaie de vider le cache de ton navigateur.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
