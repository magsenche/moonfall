/**
 * Narration des transitions de phase — le texte du « rideau ».
 *
 * À chaque changement de phase, le rideau raconte ce qui vient de se passer,
 * comme le ferait un MJ : la nuit tombe, le village se réveille (et découvre
 * ses morts), le conseil s'ouvre. Les causes secrètes (salvateur, potion,
 * ancien) ne sont jamais révélées : « personne n'est mort cette nuit », sans
 * dire pourquoi.
 *
 * Chaque partie tire UN narrateur à personnalité (déterministe sur l'id de
 * partie) qui donne le ton du début à la fin — le fil conducteur : le Corbeau
 * (humour noir), la Commère (potins) ou l'Aubergiste (bonhomme). Les faits
 * (qui est mort, quel rôle) restent neutres ; la personnalité colore les
 * ambiances et commente les verdicts.
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

// ─────────────────────────────────────────────────────────────────────────────
// Les narrateurs
// ─────────────────────────────────────────────────────────────────────────────

export type NarratorId = 'corbeau' | 'commere' | 'aubergiste';

export interface NarratorProfile {
  id: NarratorId;
  name: string;
  tagline: string;
}

export const NARRATORS: Record<NarratorId, NarratorProfile> = {
  corbeau: {
    id: 'corbeau',
    name: 'Le Corbeau',
    tagline: 'perché au-dessus de vos malheurs',
  },
  commere: {
    id: 'commere',
    name: 'La Commère',
    tagline: 'elle sait tout, elle dit tout (ou presque)',
  },
  aubergiste: {
    id: 'aubergiste',
    name: "L'Aubergiste",
    tagline: 'il voit tout passer depuis son comptoir',
  },
};

/** Narrateur de la partie : stable pour toute la partie, identique partout. */
export function narratorForGame(gameId: string): NarratorId {
  let hash = 0;
  for (let i = 0; i < gameId.length; i++) {
    hash = (hash * 31 + gameId.charCodeAt(i)) | 0;
  }
  const ids: NarratorId[] = ['corbeau', 'commere', 'aubergiste'];
  return ids[Math.abs(hash) % ids.length];
}

interface NarratorTexts {
  nightFalls: string[];
  dayBreaksDeath: string[];
  dayBreaksSafe: string[];
  councilOpens: string[];
  /** Commentaire après un verdict qui a démasqué un loup */
  verdictWolf: string[];
  /** Commentaire après un innocent envoyé au bûcher */
  verdictInnocent: string[];
}

const TEXTS: Record<NarratorId, NarratorTexts> = {
  corbeau: {
    nightFalls: [
      'La nuit tombe. Croâ. Quelqu\'un ici ne verra pas l\'aube — je ne dis pas qui, je plane au-dessus de tout ça.',
      'Le village s\'endort. Moi je reste éveillé : les meilleurs spectacles se jouent dans le noir.',
      'Les volets claquent, les prières commencent. Elles n\'ont jamais sauvé personne.',
    ],
    dayBreaksDeath: [
      'L\'aube se lève, blafarde. J\'ai déjà repéré le corps — l\'odeur, tout ça.',
      'Le coq chante. Pas pour tout le monde.',
      'Matin gris. Comptez-vous, je vous laisse deviner qui manque.',
    ],
    dayBreaksSafe: [
      'Personne n\'est mort cette nuit. Décevant, si vous voulez mon avis de charognard.',
      'Tout le monde respire encore. Les crocs ont mordu dans le vide — quel gâchis.',
      'Aucune victime. Ne vous réjouissez pas trop vite : ce n\'est que partie remise.',
    ],
    councilOpens: [
      'Le tribunal des vivants s\'ouvre. Ma partie préférée : vous vous entretuez tout seuls.',
      'Les torches s\'allument. Désignez un coupable — le vrai, si le hasard vous aide.',
      'L\'heure du jugement. Le bûcher est prêt, il ne manque plus que le nom.',
    ],
    verdictWolf: [
      'Bien visé. Pour une fois.',
      'Un monstre de moins. Il en reste peut-être. Croâ.',
      'La foule a eu du flair. Ça ne durera pas.',
    ],
    verdictInnocent: [
      'Un innocent. Magnifique travail, vraiment.',
      'Raté. Le vrai monstre vous regarde brûler l\'un des vôtres.',
      'J\'ai vu des lynchages plus utiles. Rarement plus enthousiastes.',
    ],
  },
  commere: {
    nightFalls: [
      'Tout le monde au lit ! Enfin... c\'est ce qu\'ils disent. J\'ai vu de la lumière chez certains.',
      'La nuit tombe. Entre nous, je me demande bien qui va « dormir » et qui va rôder.',
      'Chut, le village s\'endort. Moi je note tout : qui bâille, qui transpire, qui vérifie ses dents.',
    ],
    dayBreaksDeath: [
      'Réveillez-vous, réveillez-vous ! Vous n\'allez PAS croire ce qui s\'est passé cette nuit.',
      'J\'étais aux premières loges derrière mes volets, et croyez-moi, ça a griffé.',
      'Le boulanger m\'a tout raconté ce matin. Enfin... ce qu\'il en reste à raconter.',
    ],
    dayBreaksSafe: [
      'Personne n\'est mort ! Je suis presque déçue : je n\'ai rien à raconter aujourd\'hui.',
      'Tout le monde est là. Soit les loups digèrent encore, soit quelqu\'un a été protégé... et je veux savoir qui.',
      'Nuit calme, paraît-il. Moi j\'ai entendu gratter à une porte. Je ne dirai pas laquelle. Enfin, pas gratuitement.',
    ],
    councilOpens: [
      'Sur la place, tout le monde ! C\'est l\'heure de laver le linge sale — et il y en a un paquet.',
      'Le conseil s\'ouvre. J\'ai des noms, des heures et des témoins. Faites-en bon usage.',
      'Alors, on accuse qui aujourd\'hui ? Moi j\'ai ma petite idée, comme toujours.',
    ],
    verdictWolf: [
      'Je l\'avais TOUJOURS dit ! Mais personne ne m\'écoute, dans ce village.',
      'Ça ne m\'étonne pas : il souriait bizarrement les soirs de pleine lune.',
      'Un loup ! Vous vous rendez compte ? Il mangeait à notre table !',
    ],
    verdictInnocent: [
      'Oh là là... c\'était pas lui. Bon. On dira que c\'est la faute du voisin.',
      'Un innocent au bûcher ! Ne comptez pas sur moi pour culpabiliser : je n\'ai voté que du bout des doigts.',
      'Aïe. Sa pauvre mère. Enfin... au moins, on est fixés sur lui.',
    ],
  },
  aubergiste: {
    nightFalls: [
      'Dernière tournée, tout le monde dehors ! Rentrez bien... et fermez à double tour, hein.',
      'La nuit tombe. Je laisse une chandelle allumée et le tisonnier à portée de main. On ne sait jamais.',
      'Le village s\'endort le ventre plein. Certains comptent bien se resservir cette nuit.',
    ],
    dayBreaksDeath: [
      'Le café est chaud... mais il y a une chaise vide au comptoir.',
      'Mauvais matin : j\'ai mis un couvert de trop.',
      'L\'aube se lève sur une table qui ne sera plus jamais complète.',
    ],
    dayBreaksSafe: [
      'Tout le monde au comptoir ce matin ! Personne n\'est mort — première tournée offerte.',
      'Nuit blanche pour les loups : ils repartent le ventre vide. Ma soupe est meilleure, voilà tout.',
      'Aucune victime cette nuit. Voilà le genre de matin que j\'aime servir.',
    ],
    councilOpens: [
      'Le conseil s\'ouvre ! Posez vos chopes, sortez vos accusations.',
      'Sur la place ! Et pas de bagarre avant le verdict : j\'ai déjà assez de vaisselle cassée.',
      'L\'heure du jugement. Je prends les paris derrière le comptoir. Discrètement.',
    ],
    verdictWolf: [
      'Un loup ! Et dire qu\'il payait toujours en retard... j\'aurais dû me douter.',
      'Bien joué, le village ! Ce soir, c\'est tournée générale.',
      'Un monstre de moins à ma table. Je vais pouvoir laisser la porte ouverte. Ou pas.',
    ],
    verdictInnocent: [
      'Sacrebleu... c\'était un brave client, lui. Le village me déçoit.',
      'Un innocent ! La prochaine fois, réfléchissez avant de sortir les fourches.',
      'Il me devait trois pièces. On dira que c\'est réglé.',
    ],
  },
};

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
 * Compose les lignes du rideau pour la phase courante, avec la voix du
 * narrateur de la partie. `events` : les derniers game_events, du plus
 * récent au plus ancien.
 */
export function buildPhaseNarration(
  status: string,
  phase: number,
  events: NarrationEventRow[],
  narrator: NarratorId = 'corbeau'
): string[] {
  const voice = TEXTS[narrator] ?? TEXTS.corbeau;

  if (status === 'conseil') {
    return [pick(voice.councilOpens, phase)];
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
        | { pseudo: string; role: string; team?: string }
        | null
        | undefined;
      if (eliminated) {
        const role = roleLabel(eliminated.role);
        lines.push(
          `⚖️ Le village a parlé : ${eliminated.pseudo} finit sur le bûcher.${role ? ` C'était ${role === 'Loup-Garou' ? 'un' : role.endsWith('e') ? 'une' : 'un'} ${role} !` : ''}`
        );
        // Le narrateur commente le verdict — coupable ou bavure
        const wasWolf = eliminated.team === 'loups' || eliminated.role === 'loup_garou';
        lines.push(pick(wasWolf ? voice.verdictWolf : voice.verdictInnocent, phase));
      } else if (council.data?.immunity_used) {
        lines.push('⚖️ Coup de théâtre au conseil : le condamné brandit son immunité et échappe au bûcher.');
      } else if (council.data?.tie) {
        lines.push('⚖️ Le village n\'a pas su trancher. Personne ne brûle ce soir... mais la nuit vient.');
      }
    }
    lines.push(`🌙 ${pick(voice.nightFalls, phase)}`);
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
      return [`☀️ ${pick(voice.dayBreaksSafe, phase)}`];
    }

    const lines: string[] = [`☀️ ${pick(voice.dayBreaksDeath, phase)}`];
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
