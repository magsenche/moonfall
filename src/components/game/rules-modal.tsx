'use client';

/**
 * RulesModal - Complete game rules in a modal
 * Accessible from lobby and during game
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllRoleDetails, type RoleDetail } from '@/lib/help/role-details';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'rules' | 'roles' | 'faq';

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rules');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Get all role details (memoized)
  const allRoles = useMemo(() => getAllRoleDetails(), []);
  const villageRoles = useMemo(() => Object.entries(allRoles).filter(([, r]) => r.team === 'village'), [allRoles]);
  const wolfRoles = useMemo(() => Object.entries(allRoles).filter(([, r]) => r.team === 'loups'), [allRoles]);
  const soloRoles = useMemo(() => Object.entries(allRoles).filter(([, r]) => r.team === 'solo'), [allRoles]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-zinc-900 border-t sm:border border-zinc-700 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag indicator (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>📖</span> Règles du jeu
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {[
            { id: 'rules' as Tab, label: 'Règles', icon: '📜' },
            { id: 'roles' as Tab, label: 'Rôles', icon: '🎭' },
            { id: 'faq' as Tab, label: 'FAQ', icon: '❓' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-zinc-100 border-b-2 border-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Principe */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">🎯 Principe du jeu</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Deux équipes s&apos;affrontent : le <span className="text-blue-400 font-medium">Village</span> et 
                  les <span className="text-red-400 font-medium">Loups-Garous</span>. 
                  Chaque joueur reçoit un rôle secret. Les villageois doivent démasquer et éliminer 
                  les loups, tandis que les loups tentent de dévorer tous les villageois.
                </p>
              </section>

              {/* Victoire */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">🏆 Conditions de victoire</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300">
                      <span className="font-semibold">🔵 Village gagne</span> : Tous les loups sont éliminés
                    </p>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-300">
                      <span className="font-semibold">🔴 Loups gagnent</span> : Les loups sont au moins aussi nombreux que les villageois
                    </p>
                  </div>
                </div>
              </section>

              {/* Phases */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">🔄 Déroulement</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🌙</span>
                    <div>
                      <p className="font-medium text-zinc-200">Nuit</p>
                      <p className="text-sm text-zinc-500">Les loups votent pour dévorer quelqu&apos;un. Les rôles spéciaux agissent.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">☀️</span>
                    <div>
                      <p className="font-medium text-zinc-200">Jour</p>
                      <p className="text-sm text-zinc-500">Le village découvre la victime et discute.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚖️</span>
                    <div>
                      <p className="font-medium text-zinc-200">Conseil</p>
                      <p className="text-sm text-zinc-500">Le village vote pour éliminer un suspect.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Missions */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">🎯 Missions IRL</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Le MJ peut créer des missions à réaliser dans la vraie vie ! 
                  Réussis-les pour gagner des points et acheter des pouvoirs dans le shop.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              {/* Village */}
              <div>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-2">
                  Équipe Village 🔵
                </h3>
                <div className="space-y-2">
                  {villageRoles.map(([key, role]) => (
                    <RoleAccordion
                      key={key}
                      role={role}
                      isExpanded={expandedRole === key}
                      onToggle={() => setExpandedRole(expandedRole === key ? null : key)}
                    />
                  ))}
                </div>
              </div>

              {/* Loups */}
              <div>
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-2">
                  Équipe Loups 🔴
                </h3>
                <div className="space-y-2">
                  {wolfRoles.map(([key, role]) => (
                    <RoleAccordion
                      key={key}
                      role={role}
                      isExpanded={expandedRole === key}
                      onToggle={() => setExpandedRole(expandedRole === key ? null : key)}
                    />
                  ))}
                </div>
              </div>

              {/* Solo */}
              {soloRoles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                    Rôles Solo ⚪
                  </h3>
                  <div className="space-y-2">
                    {soloRoles.map(([key, role]) => (
                      <RoleAccordion
                        key={key}
                        role={role}
                        isExpanded={expandedRole === key}
                        onToggle={() => setExpandedRole(expandedRole === key ? null : key)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-4">
              <FaqItem 
                question="Que se passe-t-il en cas d'égalité au vote ?"
                answer="Personne n'est éliminé. Le jeu continue avec la phase suivante."
              />
              <FaqItem 
                question="Peut-on mentir sur son rôle ?"
                answer="Oui, c'est même recommandé pour les loups ! La déduction et le bluff font partie du jeu."
              />
              <FaqItem 
                question="Les morts peuvent-ils parler ?"
                answer="Non, les joueurs éliminés ne peuvent plus communiquer. Ils observent en silence."
              />
              <FaqItem 
                question="Comment fonctionne le Mode Auto-Garou ?"
                answer="Pas de MJ dédié : les phases avancent automatiquement et tout le monde reçoit un rôle, y compris le créateur de la partie."
              />
              <FaqItem 
                question="À quoi servent les points de mission ?"
                answer="Les points gagnés via les missions peuvent être dépensés dans le Shop pour acheter des pouvoirs (immunité, vote double, etc.)."
              />
              <FaqItem 
                question="Comment voir le rôle d'un joueur mort ?"
                answer="Quand un joueur meurt, son rôle est automatiquement révélé à tous."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// Role accordion component
function RoleAccordion({ 
  role, 
  isExpanded, 
  onToggle 
}: { 
  role: RoleDetail; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{role.icon}</span>
          <span className="font-medium text-zinc-200">{role.name}</span>
        </div>
        <svg 
          className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 space-y-2">
          <p className="text-sm text-zinc-400">{role.description}</p>
          {role.power && (
            <p className="text-sm text-zinc-300">
              <span className="font-medium">⚡ Pouvoir :</span> {role.power}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// FAQ item component
function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg">
      <p className="font-medium text-zinc-200 mb-1">{question}</p>
      <p className="text-sm text-zinc-400">{answer}</p>
    </div>
  );
}

/**
 * Self-contained button that opens the rules modal
 * - 'default': Text button "📖 Règles"  
 * - 'icon': Icon-only button
 * - 'floating': Fixed floating action button for mobile
 */
export function RulesButton({ 
  variant = 'default', 
  size = 'md' 
}: { 
  variant?: 'default' | 'icon' | 'floating'; 
  size?: 'sm' | 'md' 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = size === 'sm' 
    ? 'py-1.5 px-3 text-xs' 
    : 'py-2 px-4 text-sm';

  // Floating action button (for mobile)
  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-30 w-12 h-12 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-700 rounded-full shadow-lg transition-colors touch-manipulation text-xl"
          aria-label="Règles du jeu"
          title="Règles du jeu"
        >
          📖
        </button>
        <RulesModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700 rounded-lg transition-colors touch-manipulation text-lg"
          aria-label="Règles du jeu"
          title="Règles du jeu"
        >
          📖
        </button>
        <RulesModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${sizeClasses} text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2 touch-manipulation`}
      >
        <span>📖</span> Règles
      </button>
      <RulesModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
