'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

type Step = 'email' | 'otp';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithOtp, verifyOtp, user, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const redirectTo = searchParams.get('redirect') || '/';

  // Si déjà connecté, rediriger
  if (user && !authLoading) {
    router.push(redirectTo);
    return null;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithOtp(email);
      
      if (error) {
        throw error;
      }
      
      setMessage('Un code à 6 chiffres a été envoyé à votre email');
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await verifyOtp(email, otp);
      
      if (error) {
        throw error;
      }
      
      // Succès ! L'AuthProvider va détecter le changement
      // et le useEffect au début va rediriger
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-moon-100/50">Chargement...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-village-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-moon-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-village-300">Moon</span>
            <span className="text-moon-500">fall</span>
          </h1>
          <p className="text-moon-100/50">Connexion</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {step === 'email' ? '👋 Bienvenue' : '✉️ Vérification'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'email' 
                ? 'Entre ton email pour te connecter'
                : `Un code a été envoyé à ${email}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                
                {error && (
                  <p className="text-sm text-blood-400">{error}</p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !email}
                >
                  {isLoading ? 'Envoi...' : 'Recevoir un code'}
                </Button>
                
                <p className="text-xs text-moon-100/40 text-center">
                  Un code à 6 chiffres sera envoyé à ton email
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={isLoading}
                  autoFocus
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
                
                {message && !error && (
                  <p className="text-sm text-green-400">{message}</p>
                )}
                
                {error && (
                  <p className="text-sm text-blood-400">{error}</p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? 'Vérification...' : 'Valider le code'}
                </Button>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError(null);
                    setMessage(null);
                  }}
                  className="w-full text-sm text-moon-100/50 hover:text-white transition-colors"
                >
                  ← Changer d&apos;email
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Hint */}
        <p className="text-center text-sm text-moon-100/40 mt-6">
          La connexion permet de retrouver ta partie même après avoir fermé l&apos;app
        </p>
      </div>
    </main>
  );
}

// Wrapper avec Suspense pour useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-moon-100/50">Chargement...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
