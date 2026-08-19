'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionButton, MotionCard, NightSky } from '@/components/ui';
import Image from 'next/image';
import {
  Smartphone,
  Hourglass,
  Target,
  ShoppingBag,
  MessagesSquare,
  Vote,
  ArrowLeft,
  ArrowRight,
  Play,
  BookOpen,
  Map,
  type LucideIcon,
} from 'lucide-react';

interface TutorialStep {
  id: number;
  title: string;
  icon?: LucideIcon;
  description: string;
  image?: string;
  tip?: string;
}

/**
 * Parcours "delta" : pour ceux qui connaissent déjà le Loup-Garou
 * classique. On n'explique QUE ce qui change avec Moonfall.
 */
const deltaSteps: TutorialStep[] = [
  {
    id: 1,
    title: 'Ton téléphone est ta carte',
    icon: Smartphone,
    description:
      'Ton rôle secret vit sur ton téléphone : plus besoin de fermer les yeux ni de MJ qui chuchote. La Voyante consulte ses visions sur son écran, la Sorcière choisit ses potions en silence... pendant que la vie continue autour.',
    image: '/tutorial/05-night-phase-header.png',
    tip: 'Appuie sur ta carte de rôle à tout moment pour revoir ton pouvoir et tes objectifs.',
  },
  {
    id: 2,
    title: 'La partie vit avec vous',
    icon: Hourglass,
    description:
      'Pas de table, pas de soirée dédiée : la partie se joue en vrai, sur des heures ou des jours. L\'app rythme les phases (nuit, jour, conseil) et t\'envoie une notification quand il se passe quelque chose.',
    tip: 'Active les notifications pour ne pas rater un conseil ou une élimination !',
  },
  {
    id: 3,
    title: 'Les missions IRL',
    icon: Target,
    description:
      'La grande nouveauté : des défis à réaliser dans la vraie vie (faire deviner un mot, prendre une photo, gagner une enchère...). Réussir une mission rapporte des points. Et méfie-toi : un loup peut saboter discrètement une mission collective.',
    tip: 'Plus la mission est difficile (1 à 5 étoiles), plus elle rapporte de points.',
  },
  {
    id: 4,
    title: 'La boutique de pouvoirs',
    icon: ShoppingBag,
    description:
      'Tes points de mission s\'échangent contre des avantages : immunité au prochain vote, vote qui compte double, vision sur un joueur, vote anonyme... De quoi renverser un conseil mal engagé.',
    tip: 'Un villageois discret qui accumule des points devient très dangereux.',
  },
  {
    id: 5,
    title: 'Les loups ont un chat secret',
    icon: MessagesSquare,
    description:
      'Les loups se coordonnent dans un chat privé intégré à l\'app, à n\'importe quelle heure. Ils y votent aussi leur victime chaque nuit. Petit détail : la Petite Fille peut lire ce chat... sans voir qui parle.',
    tip: 'Loups : ne vous regardez pas en riant devant les autres. Le chat, c\'est fait pour ça.',
  },
  {
    id: 6,
    title: 'Les votes se font sur le tel',
    icon: Vote,
    description:
      'Au conseil, chacun vote depuis son téléphone : fini le doigt pointé. Les résultats tombent en direct, et les pouvoirs achetés en boutique (immunité, vote double...) s\'appliquent automatiquement.',
    image: '/tutorial/07-vote-phase.png',
    tip: 'Le reste ne change pas : bluffe, accuse, défends-toi. L\'app arbitre, toi tu joues.',
  },
];

/**
 * Parcours "tour de l'app" : guide écran par écran pour découvrir
 * l'interface (l'ancien tutoriel).
 */
const tourSteps: TutorialStep[] = [
  {
    id: 1,
    title: 'Page d\'accueil',
    description: 'Bienvenue sur Moonfall ! Depuis l\'accueil, tu peux créer une partie, en rejoindre une, ou essayer la démo rapide.',
    image: '/tutorial/01-home.png',
    tip: 'La démo rapide te permet de tester le jeu avec des bots en 2 clics !',
  },
  {
    id: 2,
    title: 'Créer une partie',
    description: 'Choisis un nom pour ta partie et entre ton pseudo. Tu seras le Maître du Jeu (MJ) par défaut.',
    image: '/tutorial/02-create-game.png',
    tip: 'Le mode Auto-Garou te permet de jouer aussi, sans être MJ dédié !',
  },
  {
    id: 3,
    title: 'Le Lobby',
    description: 'Partage le code de partie avec tes amis. Ils peuvent le taper pour te rejoindre.',
    image: '/tutorial/03-lobby.png',
    tip: 'Clique sur le code pour le copier automatiquement !',
  },
  {
    id: 4,
    title: 'Les joueurs arrivent',
    description: 'Au fur et à mesure que les joueurs rejoignent, tu les vois apparaître. Minimum 3 joueurs pour lancer !',
    image: '/tutorial/04-lobby-players.png',
    tip: 'En mode dev, tu peux ajouter des bots pour tester.',
  },
  {
    id: 5,
    title: 'La Nuit',
    description: 'La partie commence la nuit. Tu découvres ton rôle secret ! Les loups-garous se réveillent pour choisir leur victime.',
    image: '/tutorial/05-night-phase-header.png',
    tip: 'Appuie sur ta carte de rôle pour voir les détails de ton personnage.',
  },
  {
    id: 6,
    title: 'Le Jour',
    description: 'Le jour se lève ! Discutez entre joueurs pour trouver les loups-garous cachés parmi vous.',
    image: '/tutorial/06-day-phase.png',
    tip: 'Observez les réactions, posez des questions... tout le monde est suspect !',
  },
  {
    id: 7,
    title: 'Le Conseil',
    description: 'Le moment du vote ! Chaque joueur choisit qui éliminer. La majorité l\'emporte.',
    image: '/tutorial/07-vote-phase.png',
    tip: 'Votez stratégiquement, mais attention aux fausses accusations !',
  },
  {
    id: 8,
    title: 'Collection de Rôles',
    description: 'Découvre tous les rôles du jeu dans la galerie. Chaque rôle a des pouvoirs uniques !',
    image: '/tutorial/08-roles-gallery-revealed.png',
    tip: 'Appuie sur une carte pour révéler le rôle et voir ses capacités.',
  },
];

type Path = 'choice' | 'delta' | 'tour';

export default function TutorialPage() {
  const router = useRouter();
  const [path, setPath] = useState<Path>('choice');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = path === 'delta' ? deltaSteps : tourSteps;
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const startPath = (p: Path) => {
    setPath(p);
    setCurrentStep(0);
  };

  return (
    <main className="min-h-screen p-4 safe-area-top safe-area-bottom">
      <NightSky />
      <div className="max-w-md mx-auto space-y-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <MotionButton
            variant="ghost"
            onClick={() => (path === 'choice' ? router.push('/') : setPath('choice'))}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </MotionButton>
          {path !== 'choice' && (
            <span className="text-moon-100/50 text-sm">
              {currentStep + 1} / {steps.length}
            </span>
          )}
        </div>

        {/* ================= Choix du parcours ================= */}
        {path === 'choice' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl font-semibold text-moon-100 mb-2">
                Comment jouer ?
              </h1>
              <p className="text-moon-100/60">
                Tu connais déjà le Loup-Garou classique ?
              </p>
            </div>

            <MotionCard
              variant="sticker"
              rotation={-0.5}
              className="cursor-pointer border-moon-500"
              onClick={() => startPath('delta')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-moon-500/15 text-moon-500">
                  <Play className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-moon-100 mb-1">
                    Oui — montre-moi ce qui change
                  </h2>
                  <p className="text-moon-100/60 text-sm">
                    6 cartes pour découvrir ce que Moonfall ajoute au jeu que tu
                    connais : missions IRL, points, boutique, chat des loups...
                  </p>
                </div>
              </div>
            </MotionCard>

            <MotionCard
              variant="sticker"
              rotation={0.5}
              className="cursor-pointer"
              onClick={() => startPath('tour')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-village-600/20 text-village-300">
                  <Map className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-moon-100 mb-1">
                    Guide complet de l&apos;app
                  </h2>
                  <p className="text-moon-100/60 text-sm">
                    Le tour de l&apos;interface écran par écran : créer une partie,
                    le lobby, les phases, les votes.
                  </p>
                </div>
              </div>
            </MotionCard>

            <MotionButton
              variant="ghost"
              className="w-full gap-2 text-moon-100/60"
              onClick={() => router.push('/regles')}
            >
              <BookOpen className="w-4 h-4" /> Lire les règles complètes (2 min)
            </MotionButton>
          </motion.div>
        )}

        {/* ================= Étapes ================= */}
        {path !== 'choice' && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${path}-${step.id}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <MotionCard variant="sticker" className="overflow-hidden p-0">
                  {/* Image (optionnelle) */}
                  {step.image ? (
                    <div className="relative w-full aspect-[9/14] bg-night-900 overflow-hidden">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        className="object-contain"
                        priority
                      />
                    </div>
                  ) : (
                    step.icon && (
                      <div className="flex items-center justify-center py-12 bg-gradient-to-b from-night-700/60 to-night-800">
                        <div className="p-6 rounded-2xl bg-moon-500/10 text-moon-500 border border-moon-500/30">
                          <step.icon className="w-14 h-14" strokeWidth={1.5} />
                        </div>
                      </div>
                    )
                  )}

                  {/* Contenu */}
                  <div className="p-5 space-y-3">
                    <h2 className="font-display text-xl font-semibold text-moon-100 flex items-center gap-2">
                      {step.image && step.icon && (
                        <step.icon className="w-5 h-5 text-moon-500 shrink-0" />
                      )}
                      {step.title}
                    </h2>
                    <p className="text-moon-100/70 leading-relaxed">{step.description}</p>

                    {step.tip && (
                      <motion.div
                        className="bg-moon-500/10 border border-moon-500/25 rounded-lg p-3"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <p className="text-moon-300 text-sm">{step.tip}</p>
                      </motion.div>
                    )}
                  </div>
                </MotionCard>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  aria-label={`Étape ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-moon-500 w-6'
                      : 'bg-white/30 hover:bg-white/50 w-2'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <MotionButton
                variant="ghost"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isFirst}
                className="flex-1 gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft className="w-4 h-4" /> Précédent
              </MotionButton>

              {isLast ? (
                <MotionButton
                  variant="primary"
                  onClick={() => router.push('/')}
                  className="flex-1 gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-4 h-4" /> Jouer !
                </MotionButton>
              ) : (
                <MotionButton
                  variant="primary"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Suivant <ArrowRight className="w-4 h-4" />
                </MotionButton>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
