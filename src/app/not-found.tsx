import Link from 'next/link';

/**
 * Custom 404 Page
 * 
 * Shown when a route doesn't exist.
 * Styled to match the Y2K/sticker aesthetic of the app.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-night-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Fun illustration */}
        <div className="text-8xl mb-4">🌙</div>
        
        {/* Error code with style */}
        <div className="relative inline-block">
          <span className="text-9xl font-black text-moon-500/20">404</span>
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">
            Perdu ?
          </span>
        </div>
        
        <p className="text-moon-100/50 text-lg">
          Cette page n&apos;existe pas... Les loups-garous l&apos;ont peut-être dévorée ! 🐺
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-moon-500 hover:bg-moon-300 text-night-950 font-semibold rounded-xl border-2 border-moon-100 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Retour à l&apos;accueil
          </Link>
          
          <Link
            href="/roles"
            className="inline-flex items-center justify-center px-6 py-3 bg-night-800 hover:bg-night-700 text-white font-semibold rounded-xl border-2 border-night-600 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Voir les rôles
          </Link>
        </div>

        <p className="text-xs text-moon-100/40 pt-8">
          Tu cherchais une partie ? Vérifie le code à 4 lettres.
        </p>
      </div>
    </div>
  );
}
