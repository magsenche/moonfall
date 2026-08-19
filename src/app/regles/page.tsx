import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Moon,
  Sun,
  Scale,
  Target,
  ShoppingBag,
  Trophy,
  Sparkles,
  Smartphone,
  Hourglass,
  MessagesSquare,
  Vote,
  ArrowRight,
} from 'lucide-react';
import { NightSky, MoonLogo } from '@/components/ui';
import { ShareButton } from './share-button';

export const metadata: Metadata = {
  title: 'Moonfall — Les règles en 2 minutes',
  description:
    'Loup-Garou grandeur nature : rôles secrets, missions IRL, votes sur téléphone. Tout ce qu\'il faut savoir avant de jouer.',
};

const ROLES_VILLAGE = [
  { name: 'Villageois', desc: 'Pas de pouvoir, mais ses missions rapportent 50% de points en plus' },
  { name: 'Voyante', desc: 'Découvre le rôle d\'un joueur chaque nuit' },
  { name: 'Sorcière', desc: 'Une potion de vie, une potion de mort — usage unique' },
  { name: 'Chasseur', desc: 'Emporte quelqu\'un dans la tombe' },
  { name: 'Salvateur', desc: 'Protège un joueur chaque nuit' },
  { name: 'Petite Fille', desc: 'Espionne le chat des loups (pseudos masqués)' },
  { name: 'Ancien', desc: 'Survit à la première attaque des loups' },
  { name: 'Trublion', desc: 'Échange les rôles de deux joueurs, une fois par partie' },
  { name: 'Enfant Sauvage', desc: 'Choisit un modèle — s\'il meurt, devient loup' },
  { name: 'Cupidon', desc: 'Lie deux amoureux : si l\'un meurt, l\'autre suit' },
];

const SHOP_ITEMS = [
  { name: 'Immunité', cost: 20, desc: 'Protégé du vote au prochain conseil' },
  { name: 'Vote double', cost: 10, desc: 'Ton vote compte deux fois' },
  { name: 'Vision', cost: 15, desc: 'Révèle si un joueur est loup ou non' },
  { name: 'Silence', cost: 12, desc: 'Réduit un joueur au silence 2 minutes' },
  { name: 'Vote anonyme', cost: 8, desc: 'Ton vote reste caché' },
  { name: 'Question au MJ', cost: 5, desc: 'Une question oui/non au Maître du Jeu' },
];

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-semibold text-moon-100 flex items-center gap-3 mb-4">
      <span className="p-2 rounded-lg bg-moon-500/10 text-moon-500 border border-moon-500/25">
        <Icon className="w-5 h-5" />
      </span>
      {children}
    </h2>
  );
}

export default function ReglesPage() {
  return (
    <main className="min-h-screen p-4 pb-16 safe-area-top safe-area-bottom">
      <NightSky />

      <div className="max-w-lg mx-auto relative z-10 space-y-10">
        {/* Hero */}
        <header className="text-center pt-8 space-y-3">
          <div className="flex justify-center">
            <MoonLogo size={64} />
          </div>
          <h1 className="font-display text-4xl font-semibold text-moon-100">
            Les règles en 2 minutes
          </h1>
          <p className="text-moon-100/60 max-w-md mx-auto">
            Moonfall, c&apos;est le Loup-Garou que tu connais — mais joué en vrai,
            sur plusieurs heures ou plusieurs jours, avec ton téléphone comme
            carte de rôle.
          </p>
          <div className="flex justify-center pt-2">
            <ShareButton />
          </div>
        </header>

        {/* Ce qui change */}
        <section>
          <SectionTitle icon={Sparkles}>Tu connais déjà le Loup-Garou ?</SectionTitle>
          <p className="text-moon-100/60 text-sm mb-4">
            Alors voilà les 5 seules choses qui changent :
          </p>
          <ul className="space-y-3">
            {[
              { icon: Smartphone, text: 'Ton téléphone est ta carte : rôle secret, pouvoirs et visions se jouent sur ton écran, sans fermer les yeux.' },
              { icon: Hourglass, text: 'La partie vit avec vous : les phases s\'étalent sur des heures ou des jours, l\'app te notifie quand il se passe quelque chose.' },
              { icon: Target, text: 'Des missions IRL rapportent des points : défis réels à accomplir entre deux conseils.' },
              { icon: ShoppingBag, text: 'Une boutique transforme tes points en pouvoirs : immunité, vote double, vision...' },
              { icon: MessagesSquare, text: 'Les loups complotent dans un chat secret intégré, et les votes se font sur le tel.' },
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-night-800/60 border border-night-600"
              >
                <item.icon className="w-5 h-5 text-moon-500 shrink-0 mt-0.5" />
                <span className="text-moon-100/80 text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Déroulé */}
        <section>
          <SectionTitle icon={Moon}>Le déroulé d&apos;un cycle</SectionTitle>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-night-800/80 border-l-4 border-village-600 border border-night-600">
              <h3 className="font-bold text-moon-100 flex items-center gap-2 mb-1">
                <Moon className="w-4 h-4 text-village-300" /> La nuit
              </h3>
              <p className="text-moon-100/60 text-sm">
                Les loups choisissent leur victime dans leur chat secret. Les rôles à
                pouvoir nocturne (Voyante, Sorcière, Salvateur...) agissent depuis leur
                téléphone, chacun de son côté.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-night-800/80 border-l-4 border-moon-500 border border-night-600">
              <h3 className="font-bold text-moon-100 flex items-center gap-2 mb-1">
                <Sun className="w-4 h-4 text-moon-500" /> Le jour
              </h3>
              <p className="text-moon-100/60 text-sm">
                On découvre qui a été dévoré. La vie continue : discutez, enquêtez,
                accomplissez vos missions... et surveillez les comportements louches.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-night-800/80 border-l-4 border-blood-500 border border-night-600">
              <h3 className="font-bold text-moon-100 flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-blood-400" /> Le conseil
              </h3>
              <p className="text-moon-100/60 text-sm">
                Le village se réunit (en vrai !) et chacun vote sur son téléphone pour
                éliminer un suspect. La majorité l&apos;emporte — les pouvoirs achetés
                s&apos;appliquent automatiquement.
              </p>
            </div>
          </div>
        </section>

        {/* Missions */}
        <section>
          <SectionTitle icon={Target}>Les missions</SectionTitle>
          <div className="space-y-3 text-sm text-moon-100/70 leading-relaxed">
            <p>
              Entre les conseils, le MJ lance des <strong className="text-moon-100">missions IRL</strong> :
              défis solo, missions collectives où tout le village doit coopérer,
              compétitions où le premier gagne, ou enchères où tu mises tes points.
            </p>
            <p>
              La difficulté (1 à 5 étoiles) fixe la récompense (2 à 10 points). Les loups
              jouent aussi les missions — refuser systématiquement, c&apos;est louche...
              mais une mission collective peut être <strong className="text-moon-100">sabotée</strong> de
              l&apos;intérieur.
            </p>
          </div>
        </section>

        {/* Shop */}
        <section>
          <SectionTitle icon={ShoppingBag}>La boutique</SectionTitle>
          <div className="rounded-xl overflow-hidden border border-night-600">
            {SHOP_ITEMS.map((item, i) => (
              <div
                key={item.name}
                className={`flex items-center justify-between gap-3 p-3 ${
                  i % 2 === 0 ? 'bg-night-800/80' : 'bg-night-800/40'
                }`}
              >
                <div>
                  <p className="text-moon-100 text-sm font-medium">{item.name}</p>
                  <p className="text-moon-100/50 text-xs">{item.desc}</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-moon-500/15 text-moon-500 text-xs font-bold">
                  {item.cost} pts
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Rôles */}
        <section>
          <SectionTitle icon={Vote}>Les rôles</SectionTitle>
          <div className="space-y-4">
            <div>
              <h3 className="text-village-300 font-bold text-sm uppercase tracking-wider mb-2">
                Le village — élimine tous les loups
              </h3>
              <ul className="space-y-1.5">
                {ROLES_VILLAGE.map((role) => (
                  <li key={role.name} className="text-sm flex gap-2">
                    <span className="text-moon-100 font-medium shrink-0">{role.name}</span>
                    <span className="text-moon-100/50">— {role.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-blood-400 font-bold text-sm uppercase tracking-wider mb-2">
                Les loups — égalez le nombre de villageois
              </h3>
              <p className="text-sm">
                <span className="text-moon-100 font-medium">Loup-Garou</span>
                <span className="text-moon-100/50"> — dévore un villageois chaque nuit, chat privé avec les autres loups</span>
              </p>
            </div>
            <div>
              <h3 className="text-solo-400 font-bold text-sm uppercase tracking-wider mb-2">
                Solo — objectif personnel
              </h3>
              <p className="text-sm">
                <span className="text-moon-100 font-medium">Assassin</span>
                <span className="text-moon-100/50"> — peut tuer un joueur (une fois) et doit rester le dernier debout</span>
              </p>
            </div>
            <Link
              href="/roles"
              className="inline-flex items-center gap-2 text-moon-500 text-sm hover:text-moon-300 transition-colors"
            >
              Voir la galerie des rôles en détail <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Victoire */}
        <section>
          <SectionTitle icon={Trophy}>Fin de partie</SectionTitle>
          <ul className="space-y-2 text-sm text-moon-100/70">
            <li className="flex gap-2">
              <span className="text-village-300 font-bold shrink-0">Village :</span>
              tous les loups sont éliminés.
            </li>
            <li className="flex gap-2">
              <span className="text-blood-400 font-bold shrink-0">Loups :</span>
              ils égalent ou dépassent le nombre de villageois vivants.
            </li>
            <li className="flex gap-2">
              <span className="text-solo-400 font-bold shrink-0">Solo :</span>
              chacun son objectif secret — méfiance.
            </li>
          </ul>
        </section>

        {/* CTA */}
        <footer className="text-center space-y-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-moon-500 hover:bg-moon-300 text-night-950 font-bold text-lg border-2 border-moon-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-all"
          >
            Créer une partie <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-moon-100/40 text-xs">
            Moonfall — Loup-Garou grandeur nature · moonfall.fr
          </p>
        </footer>
      </div>
    </main>
  );
}
