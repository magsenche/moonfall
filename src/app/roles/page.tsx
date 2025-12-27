'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { MotionButton } from '@/components/ui';
import { RoleDetailModal } from '@/components/game';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/supabase';

type DBRole = Tables<'roles'>;

interface RoleWithPowers extends DBRole {
  powers: Array<{
    id: string;
    name: string;
    description: string;
    phase: string;
  }>;
}

export default function RolesGalleryPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleWithPowers[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleWithPowers | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('roles')
        .select(`
          *,
          powers (
            id,
            name,
            description,
            phase
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setRoles(data as RoleWithPowers[]);
      }
      setIsLoading(false);
    }

    loadRoles();
  }, []);

  const handleCardClick = (role: RoleWithPowers) => {
    if (!flippedCards.has(role.id)) {
      setFlippedCards(prev => new Set(prev).add(role.id));
    } else {
      setSelectedRole(role);
    }
  };

  const teamColors = {
    loups: {
      border: 'border-red-500',
      glow: 'shadow-red-500/30',
      bg: 'from-red-950/80 via-red-900/50 to-zinc-900',
      accent: 'text-red-400',
    },
    village: {
      border: 'border-blue-500',
      glow: 'shadow-blue-500/30',
      bg: 'from-blue-950/80 via-indigo-900/50 to-zinc-900',
      accent: 'text-blue-400',
    },
    solo: {
      border: 'border-purple-500',
      glow: 'shadow-purple-500/30',
      bg: 'from-purple-950/80 via-purple-900/50 to-zinc-900',
      accent: 'text-purple-400',
    },
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pt-safe pb-safe">
      {/* Y2K Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-zinc-900 to-zinc-950" />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block mb-4"
          >
            <span className="text-6xl">🃏</span>
          </motion.div>
          
          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-3 tracking-tight',
          )}
            style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}
          >
            <span className="text-indigo-400">Collection</span>{' '}
            <span className="text-purple-400">de Rôles</span>
          </h1>
          
          <p className="text-slate-400 text-sm md:text-base">
            Découvre tous les personnages de Moonfall
          </p>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <MotionButton
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white"
          >
            ← Retour
          </MotionButton>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block text-4xl"
            >
              🌙
            </motion.div>
            <p className="text-slate-400 mt-4">Chargement des rôles...</p>
          </div>
        )}

        {/* Roles Grid */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {roles.map((role, index) => {
              const isFlipped = flippedCards.has(role.id);
              const colors = teamColors[role.team as keyof typeof teamColors] || teamColors.village;

              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="perspective-1000"
                  style={{ perspective: '1000px' }}
                >
                  <motion.div
                    className="relative w-full cursor-pointer"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 100, damping: 15 }}
                    onClick={() => handleCardClick(role)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Front - Mystery Card */}
                    <div
                      className={cn(
                        'w-full aspect-[3/4] p-6 rounded-2xl',
                        'border-3 border-white/40 bg-zinc-900',
                        'shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]',
                        'backface-hidden'
                      )}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="relative">
                          <div className={cn(
                            'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center',
                            'bg-gradient-to-br from-indigo-600/30 to-purple-600/30',
                            'border-2 border-white/20'
                          )}>
                            <span className="text-4xl">🌙</span>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-black text-white mt-4 tracking-wide">
                          ???
                        </h3>
                        <p className="text-xs text-zinc-400 mt-2">
                          Appuie pour révéler
                        </p>
                      </div>
                    </div>

                    {/* Back - Role Revealed */}
                    <div
                      className={cn(
                        'absolute inset-0 w-full aspect-[3/4] p-6 rounded-2xl',
                        'border-3 bg-gradient-to-b',
                        colors.border,
                        colors.bg,
                        'shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]',
                        colors.glow,
                        'backface-hidden'
                      )}
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <div className="h-full flex flex-col items-center justify-between text-center">
                        {/* Top Section */}
                        <div className="flex-1 flex flex-col items-center justify-center">
                          <div 
                            className={cn(
                              'w-16 h-16 rounded-xl flex items-center justify-center text-3xl',
                              'border-2 border-white/30 bg-black/20'
                            )}
                          >
                            {role.icon || '❓'}
                          </div>
                          
                          <h3 
                            className={cn('text-xl font-black mt-3 tracking-tight', colors.accent)}
                            style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                          >
                            {role.display_name}
                          </h3>
                          
                          <p className="text-slate-300 text-xs mt-2 line-clamp-3">
                            {role.short_description || role.description}
                          </p>
                        </div>

                        {/* Bottom Section */}
                        <div className="w-full pt-3 border-t border-white/10">
                          <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">
                            {role.team === 'loups' ? '🐺 Loups' : role.team === 'village' ? '🏘️ Village' : '👤 Solo'}
                          </span>
                          <p className="text-[10px] text-zinc-600 mt-1">
                            Appuie pour plus de détails
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && roles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400">Aucun rôle disponible pour le moment.</p>
          </div>
        )}
      </div>

      {/* Role Detail Modal */}
      <AnimatePresence>
        {selectedRole && (
          <RoleDetailModal
            roleName={selectedRole.name}
            isOpen={true}
            onClose={() => setSelectedRole(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
