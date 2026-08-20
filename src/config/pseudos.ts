/**
 * Pseudos rigolos proposés au hasard sur la page d'accueil (façon Kahoot :
 * le pseudo débile fait partie du jeu). Thème village & loups.
 */

export const FUNNY_PSEUDOS = [
  'Mamie Crocs',
  'Baguette Suspecte',
  'Jean-Loup',
  'Pleine Lune',
  'Croc Monsieur',
  'La Voisine Louche',
  'Père Fouras',
  'Poulet Rôti',
  'Grosse Bête',
  'Chaperon Rouge',
  'Le Boulanger',
  'Miss Teck',
  'Hurleur du 93',
  'Tonton Flingueur',
  'Bergère Vénère',
  'Loup Phoque',
  'Curé Damné',
  'Fourche Molle',
] as const;

export function randomPseudo(current?: string): string {
  const pool = FUNNY_PSEUDOS.filter((p) => p !== current);
  return pool[Math.floor(Math.random() * pool.length)];
}
