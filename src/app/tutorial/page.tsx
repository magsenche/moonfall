'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionButton, MotionCard } from '@/components/ui';
import Image from 'next/image';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  image: string;
  tip?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: '🏠 Page d\'accueil',
    description: 'Bienvenue sur Moonfall ! Depuis l\'accueil, tu peux créer une partie, en rejoindre une, ou essayer la démo rapide.',
    image: '/tutorial/01-home.png',
    tip: '💡 La Démo rapide te permet de tester le jeu avec des bots en 2 clics !'
  },
  {
    id: 2,
    title: '🎮 Créer une partie',
    description: 'Choisis un nom pour ta partie et entre ton pseudo. Tu seras le Maître du Jeu (MJ) par défaut.',
    image: '/tutorial/02-create-game.png',
    tip: '💡 Le mode Auto-Garou te permet de jouer aussi, sans être MJ dédié !'
  },
  {
    id: 3,
    title: '📋 Le Lobby',
    description: 'Partage le code de partie avec tes amis. Ils peuvent le taper pour te rejoindre.',
    image: '/tutorial/03-lobby.png',
    tip: '💡 Clique sur le code pour le copier automatiquement !'
  },
  {
    id: 4,
    title: '👥 Les joueurs arrivent',
    description: 'Au fur et à mesure que les joueurs rejoignent, tu les vois apparaître. Minimum 3 joueurs pour lancer !',
    image: '/tutorial/04-lobby-players.png',
    tip: '💡 En mode dev, tu peux ajouter des bots pour tester.'
  },
  {
    id: 5,
    title: '🌙 La Nuit',
    description: 'La partie commence la nuit. Tu découvres ton rôle secret ! Les loups-garous se réveillent pour choisir leur victime.',
    image: '/tutorial/05-night-phase-header.png',
    tip: '💡 Appuie sur ta carte de rôle pour voir les détails de ton personnage.'
  },
  {
    id: 6,
    title: '☀️ Le Jour',
    description: 'Le jour se lève ! Discutez entre joueurs pour trouver les loups-garous cachés parmi vous.',
    image: '/tutorial/06-day-phase.png',
    tip: '💡 Observez les réactions, posez des questions... tout le monde est suspect !'
  },
  {
    id: 7,
    title: '⚖️ Le Conseil',
    description: 'Le moment du vote ! Chaque joueur choisit qui éliminer. La majorité l\'emporte.',
    image: '/tutorial/07-vote-phase.png',
    tip: '💡 Votez stratégiquement, mais attention aux fausses accusations !'
  },
  {
    id: 8,
    title: '🃏 Collection de Rôles',
    description: 'Découvre tous les rôles du jeu dans la galerie. Chaque rôle a des pouvoirs uniques !',
    image: '/tutorial/08-roles-gallery-revealed.png',
    tip: '💡 Appuie sur une carte pour révéler le rôle et voir ses capacités.'
  },
];

export default function TutorialPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;

  const goNext = () => {
    if (!isLast) setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    if (!isFirst) setCurrentStep(currentStep - 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <MotionButton
            variant="ghost"
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Retour
          </MotionButton>
          <span className="text-white/60 text-sm">
            {currentStep + 1} / {tutorialSteps.length}
          </span>
        </div>

        {/* Title */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-white mb-1">📖 Tutoriel</h1>
          <p className="text-purple-300 text-sm">Apprends à jouer en 2 minutes</p>
        </motion.div>

        {/* Step Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <MotionCard variant="sticker" className="overflow-hidden">
              {/* Image */}
              <div className="relative w-full aspect-[9/16] bg-slate-800 rounded-t-xl overflow-hidden">
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <h2 className="text-xl font-bold text-white">{step.title}</h2>
                <p className="text-gray-300">{step.description}</p>
                
                {step.tip && (
                  <motion.div 
                    className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-purple-200 text-sm">{step.tip}</p>
                  </motion.div>
                )}
              </div>
            </MotionCard>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep 
                  ? 'bg-purple-500 w-6' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <MotionButton
            variant="ghost"
            onClick={goPrev}
            disabled={isFirst}
            className="flex-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ← Précédent
          </MotionButton>
          
          {isLast ? (
            <MotionButton
              variant="primary"
              onClick={() => router.push('/')}
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🎮 Jouer !
            </MotionButton>
          ) : (
            <MotionButton
              variant="primary"
              onClick={goNext}
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Suivant →
            </MotionButton>
          )}
        </div>
      </div>
    </main>
  );
}
