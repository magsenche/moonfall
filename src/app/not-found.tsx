import Link from 'next/link';

/**
 * Custom 404 Page
 * 
 * Shown when a route doesn't exist.
 * Styled to match the Y2K/sticker aesthetic of the app.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Fun illustration */}
        <div className="text-8xl mb-4">🌙</div>
        
        {/* Error code with style */}
        <div className="relative inline-block">
          <span className="text-9xl font-black text-violet-500/20">404</span>
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">
            Perdu ?
          </span>
        </div>
        
        <p className="text-slate-400 text-lg">
          Cette page n&apos;existe pas... Les loups-garous l&apos;ont peut-être dévorée ! 🐺
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl border-2 border-violet-400 shadow-[4px_4px_0_0_rgba(139,92,246,0.3)] hover:shadow-[2px_2px_0_0_rgba(139,92,246,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            🏠 Retour à l&apos;accueil
          </Link>
          
          <Link
            href="/roles"
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border-2 border-slate-600 shadow-[4px_4px_0_0_rgba(100,116,139,0.3)] hover:shadow-[2px_2px_0_0_rgba(100,116,139,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            🎭 Voir les rôles
          </Link>
        </div>

        <p className="text-xs text-slate-600 pt-8">
          Tu cherchais une partie ? Vérifie le code à 4 lettres.
        </p>
      </div>
    </div>
  );
}
