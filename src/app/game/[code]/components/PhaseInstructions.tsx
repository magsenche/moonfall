/**
 * PhaseInstructions - Display current phase info and instructions
 */

'use client';

import { Moon, Sun, Scale } from 'lucide-react';

interface PhaseInstructionsProps {
  status: string;
  isWolf: boolean;
  isSeer: boolean;
  hasVoted: boolean;
  votesCount: number;
  totalVoters: number;
}

export function PhaseInstructions({
  status,
  isWolf,
  isSeer,
  hasVoted,
  votesCount,
  totalVoters,
}: PhaseInstructionsProps) {
  if (status === 'nuit') {
    return (
      <div className="text-center">
        <p className="mb-2 flex justify-center"><Moon className="w-6 h-6 text-village-300" /></p>
        <h3 className="font-bold text-white mb-2">C&apos;est la nuit</h3>
        <p className="text-moon-100/60 text-sm">
          {isWolf
            ? "Concertez-vous avec votre meute pour choisir une victime."
            : isSeer
            ? "Vous pouvez sonder l'âme d'un joueur."
            : "Le village dort. Attendez le lever du jour..."}
        </p>
      </div>
    );
  }

  if (status === 'jour') {
    return (
      <div className="text-center">
        <p className="mb-2 flex justify-center"><Sun className="w-6 h-6 text-moon-500" /></p>
        <h3 className="font-bold text-white mb-2">C&apos;est le jour</h3>
        <p className="text-moon-100/60 text-sm">
          Discutez avec les autres villageois et trouvez les loups-garous !
        </p>
      </div>
    );
  }

  if (status === 'conseil') {
    return (
      <div className="text-center">
        <p className="mb-2 flex justify-center"><Scale className="w-6 h-6 text-blood-400" /></p>
        <h3 className="font-bold text-white mb-2">Conseil du village</h3>
        {hasVoted ? (
          <p className="text-green-400 text-sm">
            ✓ Vote enregistré ! ({votesCount}/{totalVoters})
          </p>
        ) : (
          <p className="text-moon-100/60 text-sm">
            Sélectionnez un joueur à éliminer ci-dessous.
          </p>
        )}
      </div>
    );
  }

  return null;
}
