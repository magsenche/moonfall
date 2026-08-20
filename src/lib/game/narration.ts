/**
 * Narration des transitions de phase — le texte du « rideau ».
 *
 * À chaque changement de phase, le rideau raconte ce qui vient de se passer,
 * comme le ferait un MJ : la nuit tombe, le village se réveille (et découvre
 * ses morts), le conseil s'ouvre. Les causes secrètes (salvateur, potion,
 * ancien) ne sont jamais révélées : « personne n'est mort cette nuit », sans
 * dire pourquoi.
 *
 * Fonctions pures (aucun import) — testées par `npm run test:unit`,
 * utilisées par GET /api/games/[code]/narration.
 */

export interface NarrationEventRow {
  event_type: string;
  data: Record<string, unknown> | null;
  created_at: string;
}

const str = (data: Record<string, unknown> | null, key: string): string | null => {
  const value = data?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

/** Variante déterministe : même phase → même texte sur tous les téléphones. */
const pick = (variants: string[], seed: number): string =>
  variants[Math.abs(seed) % variants.length];

const NIGHT_FALLS = [
  'La nuit tombe sur le village. Les volets claquent, les portes se verrouillent.',
  'Le village s\'endort... mais certains ne ferment qu\'un œil.',
  'La lune se lève. Quelque part, des griffes raclent le sol.',
];

const DAY_BREAKS_DEATH = [
  'Le village se réveille au chant du coq...',
  'L\'aube se lève, blafarde...',
  'Le soleil perce la brume...',
];

const DAY_BREAKS_SAFE = [
  'Le village se réveille au complet. Personne n\'est mort cette nuit — miracle ou calcul ?',
  'L\'aube se lève et tout le monde répond à l\'appel. Cette nuit, les crocs ont mordu dans le vide.',
  'Matin clair : aucune victime. Le village retient son souffle.',
];

const COUNCIL_OPENS = [
  'L\'heure du jugement a sonné. Le village se rassemble sur la place.',
  'Les torches s\'allument : le conseil s\'ouvre, et quelqu\'un n\'en reviendra pas.',
  'Le tambour résonne. Il est temps de désigner un coupable.',
];

/** Nom d'affichage d'un rôle (loup_garou → Loup-Garou). */
export const roleLabel = (role: string | null): string | null => {
  if (!role) return null;
  const labels: Record<string, string> = {
    loup_garou: 'Loup-Garou',
    villageois: 'Villageois',
    voyante: 'Voyante',
    sorciere: 'Sorcière',
    chasseur: 'Chasseur',
    cupidon: 'Cupidon',
    salvateur: 'Salvateur',
    petite_fille: 'Petite Fille',
    ancien: 'Ancien',
    trublion: 'Trublion',
    assassin: 'Assassin',
    enfant_sauvage: 'Enfant Sauvage',
  };
  return labels[role] ?? role;
};

/**
 * Compose les lignes du rideau pour la phase courante.
 * `events` : les derniers game_events, du plus récent au plus ancien.
 */
export function buildPhaseNarration(
  status: string,
  phase: number,
  events: NarrationEventRow[]
): string[] {
  if (status === 'conseil') {
    return [pick(COUNCIL_OPENS, phase)];
  }

  if (status === 'nuit') {
    const lines: string[] = [];
    // Verdict du conseil qui vient de se clore (phase précédente)
    const council = events.find(
      (e) =>
        e.event_type === 'council_results' &&
        (e.data?.phase as number | undefined) === phase - 1
    );
    if (council) {
      const eliminated = council.data?.eliminated as
        | { pseudo: string; role: string }
        | null
        | undefined;
      if (eliminated) {
        const role = roleLabel(eliminated.role);
        lines.push(
          `⚖️ Le village a parlé : ${eliminated.pseudo} finit sur le bûcher.${role ? ` C'était ${role === 'Loup-Garou' ? 'un' : role.endsWith('e') ? 'une' : 'un'} ${role} !` : ''}`
        );
      } else if (council.data?.immunity_used) {
        lines.push('⚖️ Coup de théâtre au conseil : le condamné brandit son immunité et échappe au bûcher.');
      } else if (council.data?.tie) {
        lines.push('⚖️ Le village n\'a pas su trancher. Personne ne brûle ce soir... mais la nuit vient.');
      }
    }
    lines.push(`🌙 ${pick(NIGHT_FALLS, phase)}`);
    return lines;
  }

  if (status === 'jour') {
    // Ancre : le dernier dénouement de nuit (dévoration ou nuit blanche)
    const anchor = events.find(
      (e) =>
        e.event_type === 'wolf_kill' ||
        (e.event_type === 'phase_change' &&
          str(e.data, 'to') === 'jour' &&
          (e.data?.noVictim === true ||
            e.data?.elderSaved === true ||
            e.data?.salvateurSaved === true ||
            e.data?.witchSaved === true))
    );

    if (!anchor || anchor.event_type !== 'wolf_kill') {
      return [`☀️ ${pick(DAY_BREAKS_SAFE, phase)}`];
    }

    const lines: string[] = [`☀️ ${pick(DAY_BREAKS_DEATH, phase)}`];
    const victim = str(anchor.data, 'victim_name');
    const role = roleLabel(str(anchor.data, 'victim_role'));
    lines.push(
      `🐺 ${victim ?? 'Quelqu\'un'} ne se réveillera plus.${role ? ` C'était ${role === 'Loup-Garou' ? 'un' : role.endsWith('e') ? 'une' : 'un'} ${role}.` : ''}`
    );

    // La cascade de la même résolution (chagrin, tir, poison) suit l'ancre
    const anchorTime = anchor.created_at;
    for (const event of events) {
      if (event.created_at < anchorTime) continue;
      if (event.event_type === 'lover_heartbreak_death') {
        const lover = str(event.data, 'lover_name');
        lines.push(`💔 ${lover ?? 'Son amour'} meurt de chagrin.`);
      } else if (event.event_type === 'witch_poison_kill') {
        const poisoned = str(event.data, 'victim_name');
        lines.push(`☠️ ${poisoned ?? 'Un joueur'} est retrouvé sans vie, les lèvres noires.`);
      } else if (event.event_type === 'hunter_shot') {
        const hunter = str(event.data, 'hunter_name');
        const shot = str(event.data, 'victim_name');
        lines.push(`🔫 Dans un dernier souffle, ${hunter ?? 'le Chasseur'} abat ${shot ?? 'un joueur'}.`);
      }
    }
    return lines;
  }

  return [];
}
