'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { MotionButton, MoonLogo, NightSky } from '@/components/ui';
import { RoleDetailModal } from '@/components/game';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
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
      border: 'border-blood-500',
      glow: 'shadow-blood-500/30',
      bg: 'from-blood-700/60 via-[#2a1015] to-night-900',
      accent: 'text-blood-400',
      dot: 'bg-blood-400',
      label: 'Loups',
    },
    village: {
      border: 'border-village-600',
      glow: 'shadow-village-600/30',
      bg: 'from-village-600/40 via-[#12203c] to-night-900',
      accent: 'text-village-300',
      dot: 'bg-village-300',
      label: 'Village',
    },
    solo: {
      border: 'border-solo-400',
      glow: 'shadow-solo-400/30',
      bg: 'from-solo-400/25 via-night-700 to-night-900',
      accent: 'text-solo-400',
      dot: 'bg-solo-400',
      label: 'Solo',
    },
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pt-safe pb-safe">
      <NightSky />

      <div className="w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-block mb-3">
            <MoonLogo size={56} />
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-3 text-moon-100">
            Collection de rôles
          </h1>

          <p className="text-moon-100/50 text-sm md:text-base">
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
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </MotionButton>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-20">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block"
            >
              <MoonLogo size={48} />
            </motion.div>
            <p className="text-moon-100/50 mt-4">Chargement des rôles...</p>
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
                        'border-3 border-moon-100/40 bg-night-900',
                        'shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]',
                        'backface-hidden'
                      )}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="relative">
                          <div className={cn(
                            'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center',
                            'bg-moon-500/10 border-2 border-moon-500/25'
                          )}>
                            <MoonLogo size={48} />
                          </div>
                        </div>
                        
                        <h3 className="font-display text-lg font-semibold text-moon-100 mt-4 tracking-wide">
                          ???
                        </h3>
                        <p className="text-xs text-moon-100/40 mt-2">
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
                            className={cn('font-display text-xl font-semibold mt-3 tracking-tight', colors.accent)}
                          >
                            {role.display_name}
                          </h3>
                          
                          <p className="text-moon-100/70 text-xs mt-2 line-clamp-3">
                            {role.short_description || role.description}
                          </p>
                        </div>

                        {/* Bottom Section */}
                        <div className="w-full pt-3 border-t border-white/10">
                          <span className="inline-flex items-center gap-1.5 text-xs text-moon-100/60 font-bold tracking-widest uppercase">
                            <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
                            {colors.label}
                          </span>
                          <p className="text-[10px] text-moon-100/30 mt-1">
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
            <p className="text-moon-100/50">Aucun rôle disponible pour le moment.</p>
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
