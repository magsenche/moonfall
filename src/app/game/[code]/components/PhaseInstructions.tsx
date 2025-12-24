/**
 * PhaseInstructions - Display current phase info and instructions
 */

'use client';

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
        <p className="text-xl mb-2">🌙</p>
        <h3 className="font-bold text-white mb-2">C&apos;est la nuit</h3>
        <p className="text-slate-400 text-sm">
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
        <p className="text-xl mb-2">☀️</p>
        <h3 className="font-bold text-white mb-2">C&apos;est le jour</h3>
        <p className="text-slate-400 text-sm">
          Discutez avec les autres villageois et trouvez les loups-garous !
        </p>
      </div>
    );
  }

  if (status === 'conseil') {
    return (
      <div className="text-center">
        <p className="text-xl mb-2">⚖️</p>
        <h3 className="font-bold text-white mb-2">Conseil du village</h3>
        {hasVoted ? (
          <p className="text-green-400 text-sm">
            ✓ Vote enregistré ! ({votesCount}/{totalVoters})
          </p>
        ) : (
          <p className="text-slate-400 text-sm">
            Sélectionnez un joueur à éliminer ci-dessous.
          </p>
        )}
      </div>
    );
  }

  return null;
}
