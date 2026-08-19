/**
 * Composition « Partie classique » : la distribution de rôles recommandée
 * pour découvrir le jeu, calquée sur le loup-garou de cartes (Thiercelieux).
 *
 * Fonction pure (aucun import) — testée par `npm run test:unit` et utilisée
 * côté serveur (route start) comme côté client (aperçu dans le lobby).
 */

/** Distribution par NOM de rôle pour un nombre de joueurs donné. */
export function classicComposition(playerCount: number): Record<string, number> {
  const n = Math.max(3, Math.floor(playerCount));

  // 1 loup jusqu'à 7 joueurs, 2 à partir de 8, 3 à partir de 12 (≈ n/4)
  const wolves = Math.max(1, Math.floor(n / 4));

  const composition: Record<string, number> = { loup_garou: wolves };
  if (n >= 4) composition.voyante = 1;
  if (n >= 6) composition.sorciere = 1;
  if (n >= 7) composition.chasseur = 1;

  const special = Object.values(composition).reduce((a, b) => a + b, 0);
  composition.villageois = n - special;

  return composition;
}
