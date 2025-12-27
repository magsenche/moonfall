'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionCard, CardContent, MotionButton } from '@/components/ui';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8">
      {/* Background overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "absolute inset-0",
          winner === 'village' 
            ? 'bg-linear-to-b from-blue-950/95 via-slate-900/95 to-green-950/95'
            : 'bg-linear-to-b from-red-950/95 via-slate-900/95 to-purple-950/95'
        )} 
      />
      
      {/* Noise texture */}
      <div className="noise-overlay" />

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
              borderRadius: '2px',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg mx-4 my-auto">
        {/* Victory announcement */}
        <AnimatePresence>
          {showResults && (
            <motion.div 
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="text-center mb-8"
            >
              <motion.div 
                className="text-8xl mb-4"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {winnerEmoji}
              </motion.div>
              <h1 
                className={cn(
                  "text-5xl font-black mb-2",
                  winner === 'village' ? 'text-blue-400' : 'text-red-400'
                )}
                style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}
              >
                {winnerTeam} gagne !
              </h1>
              <p className="text-lg text-slate-300 font-medium">{winnerMessage}</p>
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  "inline-block mt-3 px-4 py-1 rounded-full text-sm font-medium",
                  "bg-zinc-800/80 border border-white/20 text-slate-400",
                  "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                )}
              >
                {gameName}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results card */}
        <AnimatePresence>
          {showResults && (
            <MotionCard 
              variant="sticker"
              rotation={0}
              className={cn(
                winner === 'village' 
                  ? 'border-blue-500/50'
                  : 'border-red-500/50'
              )}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <CardContent className="pt-6">
                {/* Winners section */}
                <div className="mb-6">
                  <h3 className={cn(
                    "text-sm font-bold mb-3 flex items-center gap-2",
                    winner === 'village' ? 'text-blue-400' : 'text-red-400'
                  )}>
                    <span>👑</span>
                    <span>Vainqueurs</span>
                  </h3>
                  <div className="space-y-2">
                    {winners.map((player, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border",
                          "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                          winner === 'village' 
                            ? 'bg-blue-900/30 border-blue-500/50' 
                            : 'bg-red-900/30 border-red-500/50'
                        )}
                      >
                        <span className="text-white font-bold">
                          {player.pseudo}
                          {player.isAlive ? '' : ' ☠️'}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          "bg-zinc-700 border border-zinc-500 text-slate-300"
                        )}>
                          {player.roleName}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Losers section */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold mb-3 text-slate-500 flex items-center gap-2">
                    <span>💀</span>
                    <span>Vaincus</span>
                  </h3>
                  <div className="space-y-2">
                    {losers.map((player, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl",
                          "bg-zinc-800/50 border border-zinc-700/50"
                        )}
                      >
                        <span className="text-slate-400">
                          {player.pseudo}
                          {player.isAlive ? '' : ' ☠️'}
                        </span>
                        <span className="text-xs text-slate-500">{player.roleName}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center mb-6">
                  {[
                    { value: players.length, label: 'Joueurs', color: 'text-white' },
                    { value: players.filter(p => p.isAlive).length, label: 'Survivants', color: 'text-green-400' },
                    { value: players.filter(p => !p.isAlive).length, label: 'Éliminés', color: 'text-red-400' },
                  ].map((stat, i) => (
                    <motion.div 
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + i * 0.1 }}
                      className={cn(
                        "p-3 rounded-xl border",
                        "bg-zinc-800/50 border-zinc-700/50",
                        "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                      )}
                    >
                      <div className={cn("text-2xl font-black", stat.color)}>{stat.value}</div>
                      <div className="text-xs text-slate-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Play again button */}
                {onPlayAgain && (
                  <MotionButton
                    variant="sticker"
                    onClick={onPlayAgain}
                    className={cn(
                      "w-full py-4 text-lg",
                      winner === 'village'
                        ? 'bg-blue-600 border-blue-400 hover:bg-blue-500'
                        : 'bg-red-600 border-red-400 hover:bg-red-500'
                    )}
                  >
                    🔄 Nouvelle partie
                  </MotionButton>
                )}
              </CardContent>
            </MotionCard>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
