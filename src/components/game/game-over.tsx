'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Confetti {
  id: number;
  left: number;
  colorIndex: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

interface GameOverProps {
  winner: 'village' | 'loups';
  gameName: string;
  players: {
    pseudo: string;
    roleName?: string;
    team?: string;
    isAlive: boolean;
  }[];
  onPlayAgain?: () => void;
}

// Confetti colors based on winner
const VILLAGE_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#10b981', '#34d399', '#ffffff'];
const WOLF_COLORS = ['#ef4444', '#f87171', '#fca5a5', '#8b5cf6', '#a78bfa', '#1e1e1e'];

// Pre-generate confetti with deterministic values (index-based pseudo-random)
const CONFETTI_PIECES: Confetti[] = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  left: ((i * 7 + 13) % 100),
  colorIndex: ((i * 11 + 23) % 6),
  delay: ((i * 13 + 37) % 100) / 100 * 3,
  duration: 3 + ((i * 17 + 41) % 100) / 100 * 2,
  size: 8 + ((i * 19 + 47) % 100) / 100 * 8,
  rotation: ((i * 23 + 53) % 100) / 100 * 360,
}));

export function GameOver({ winner, gameName, players, onPlayAgain }: GameOverProps) {
  const [showResults, setShowResults] = useState(false);
  
  const colors = winner === 'village' ? VILLAGE_COLORS : WOLF_COLORS;

  // Show results after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowResults(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const winnerTeam = winner === 'village' ? 'Le Village' : 'Les Loups-Garous';
  const winnerEmoji = winner === 'village' ? '🏆' : '🐺';
  const winnerMessage = winner === 'village' 
    ? 'Les villageois ont éliminé tous les loups-garous !'
    : 'Les loups-garous ont dévoré le village !';

  // Separate winners and losers
  const winners = players.filter(p => 
    winner === 'village' ? p.team !== 'loups' : p.team === 'loups'
  );
  const losers = players.filter(p => 
    winner === 'village' ? p.team === 'loups' : p.team !== 'loups'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Background overlay */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        winner === 'village' 
          ? 'bg-linear-to-b from-blue-950/95 via-slate-900/95 to-green-950/95'
          : 'bg-linear-to-b from-red-950/95 via-slate-900/95 to-purple-950/95'
      )} />

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CONFETTI_PIECES.map((piece) => (
          <div
            key={piece.id}
            className="absolute -top-4 animate-confetti"
            style={{
              left: `${piece.left}%`,
              backgroundColor: colors[piece.colorIndex],
              width: piece.size,
              height: piece.size * 0.6,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Victory announcement */}
        <div className={cn(
          "text-center mb-8 transition-all duration-1000",
          showResults ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
        )}>
          <div className="text-8xl mb-4 animate-bounce">{winnerEmoji}</div>
          <h1 className={cn(
            "text-4xl font-bold mb-2",
            winner === 'village' ? 'text-blue-400' : 'text-red-400'
          )}>
            {winnerTeam} gagne !
          </h1>
          <p className="text-lg text-slate-300">{winnerMessage}</p>
          <p className="text-sm text-slate-500 mt-2">{gameName}</p>
        </div>

        {/* Results card */}
        <Card className={cn(
          "transition-all duration-1000 delay-500",
          showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
          winner === 'village' 
            ? 'border-blue-500/30 bg-blue-950/30'
            : 'border-red-500/30 bg-red-950/30'
        )}>
          <CardContent className="pt-6">
            {/* Winners section */}
            <div className="mb-6">
              <h3 className={cn(
                "text-sm font-medium mb-3 flex items-center gap-2",
                winner === 'village' ? 'text-blue-400' : 'text-red-400'
              )}>
                <span>👑</span>
                <span>Vainqueurs</span>
              </h3>
              <div className="space-y-2">
                {winners.map((player, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      winner === 'village' ? 'bg-blue-500/10' : 'bg-red-500/10'
                    )}
                  >
                    <span className="text-white font-medium">
                      {player.pseudo}
                      {player.isAlive ? '' : ' ☠️'}
                    </span>
                    <span className="text-sm text-slate-400">{player.roleName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Losers section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 text-slate-500 flex items-center gap-2">
                <span>💀</span>
                <span>Vaincus</span>
              </h3>
              <div className="space-y-2">
                {losers.map((player, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30"
                  >
                    <span className="text-slate-400">
                      {player.pseudo}
                      {player.isAlive ? '' : ' ☠️'}
                    </span>
                    <span className="text-sm text-slate-500">{player.roleName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="text-2xl font-bold text-white">{players.length}</div>
                <div className="text-xs text-slate-500">Joueurs</div>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  {players.filter(p => p.isAlive).length}
                </div>
                <div className="text-xs text-slate-500">Survivants</div>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="text-2xl font-bold text-red-400">
                  {players.filter(p => !p.isAlive).length}
                </div>
                <div className="text-xs text-slate-500">Éliminés</div>
              </div>
            </div>

            {/* Play again button */}
            {onPlayAgain && (
              <button
                onClick={onPlayAgain}
                className={cn(
                  "w-full py-3 rounded-xl font-medium transition-colors",
                  winner === 'village'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                )}
              >
                🔄 Nouvelle partie
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
