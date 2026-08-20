/**
 * Récap narratif de fin de partie : transforme le journal `game_events`
 * en chronique lisible + titres décernés.
 *
 * Fonctions pures (aucun import) — testées par `npm run test:unit`,
 * utilisées par GET /api/games/[code]/recap.
 */

export interface RecapEventRow {
  event_type: string;
  actor_id: string | null;
  target_id: string | null;
  data: Record<string, unknown> | null;
}

export interface RecapPlayer {
  id: string;
  pseudo: string;
  roleName: string | null;
  team: string | null;
  isAlive: boolean;
}

export interface RecapTitle {
  emoji: string;
  label: string;
  value: string;
}

export interface Recap {
  timeline: string[];
  titles: RecapTitle[];
}

export interface RecapIntuition {
  voter_id: string;
  target_id: string | null;
}

const str = (data: Record<string, unknown> | null, key: string): string | null => {
  const value = data?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const num = (data: Record<string, unknown> | null, key: string): number | null => {
  const value = data?.[key];
  return typeof value === 'number' ? value : null;
};

/**
 * Construit la chronique chronologique de la partie.
 * `events` doit être trié par created_at croissant.
 */
export function buildRecap(
  events: RecapEventRow[],
  players: RecapPlayer[],
  intuitions: RecapIntuition[] = [],
  procesVotes: RecapIntuition[] = []
): Recap {
  const byId = new Map(players.map((p) => [p.id, p]));
  const pseudoOf = (id: string | null): string | null => (id ? (byId.get(id)?.pseudo ?? null) : null);

  const timeline: string[] = [];
  let night = 0;
  let council = 0;
  let firstVictim: string | null = null;
  let heartbreak: string | null = null;
  let hunterName: string | null = null;
  let mysteryDeath = false;

  const markVictim = (name: string | null) => {
    if (name && !firstVictim) firstVictim = name;
  };

  for (const event of events) {
    const d = event.data;
    switch (event.event_type) {
      case 'game_started': {
        const playerCount = num(d, 'player_count');
        const wolfCount = num(d, 'wolf_count');
        night = 1;
        timeline.push(
          `🌙 Nuit 1 — La partie commence : ${playerCount ?? '?'} joueurs, dont ${wolfCount ?? '?'} loup${(wolfCount ?? 0) > 1 ? 's' : ''} cachés parmi eux.`
        );
        break;
      }
      case 'cupidon_lovers_chosen': {
        const l1 = str(d, 'lover1_name');
        const l2 = str(d, 'lover2_name');
        timeline.push(`💘 Cupidon unit ${l1 ?? '?'} et ${l2 ?? '?'} en secret.`);
        break;
      }
      case 'wolf_kill': {
        const name = str(d, 'victim_name');
        markVictim(name);
        timeline.push(`🐺 ${name ?? 'Quelqu’un'} est dévoré par les loups.`);
        break;
      }
      case 'elder_saved': {
        timeline.push(`🛡️ ${str(d, 'player_name') ?? 'L’Ancien'} encaisse l’attaque des loups et survit.`);
        break;
      }
      case 'salvateur_saved': {
        timeline.push(`🛡️ ${str(d, 'saved_name') ?? 'Un joueur'} est protégé par le Salvateur : les loups repartent bredouilles.`);
        break;
      }
      case 'witch_saved_victim': {
        timeline.push(`🧪 La Sorcière verse sa potion de vie : ${str(d, 'saved_name') ?? 'la victime'} respire encore.`);
        break;
      }
      case 'witch_poison_kill': {
        const name = str(d, 'victim_name');
        markVictim(name);
        timeline.push(`☠️ ${name ?? 'Quelqu’un'} succombe au poison de la Sorcière.`);
        break;
      }
      case 'lover_heartbreak_death': {
        const name = str(d, 'lover_name');
        heartbreak = heartbreak ?? name;
        timeline.push(`💔 ${name ?? 'Son amour'} meurt de chagrin.`);
        break;
      }
      case 'wild_child_transformed': {
        timeline.push(`🐺 Son modèle est mort : ${str(d, 'child_name') ?? 'l’Enfant Sauvage'} rejoint la meute.`);
        break;
      }
      case 'hunter_shot': {
        const hunter = str(d, 'hunter_name');
        const victim = str(d, 'victim_name') ?? str(d, 'target_name');
        hunterName = hunterName ?? hunter;
        markVictim(victim);
        timeline.push(`🔫 Dans son dernier souffle, ${hunter ?? 'le Chasseur'} abat ${victim ?? 'un joueur'}.`);
        break;
      }
      case 'player_eliminated': {
        const name = str(d, 'pseudo');
        const votes = num(d, 'votes');
        council += 1;
        markVictim(name);
        timeline.push(
          `⚖️ Conseil ${council} — Le village envoie ${name ?? 'un joueur'} au bûcher${votes ? ` (${votes} voix)` : ''}.`
        );
        break;
      }
      case 'immunity_used': {
        const name = pseudoOf(event.actor_id);
        timeline.push(`🛡️ Coup de théâtre : ${name ?? 'un joueur'} brandit son immunité et échappe au bûcher.`);
        break;
      }
      case 'player_killed': {
        // Assassinat silencieux : la cause reste mystérieuse dans la chronique
        const name = pseudoOf(event.target_id);
        markVictim(name);
        mysteryDeath = true;
        timeline.push(`🗡️ ${name ?? 'Un joueur'} est retrouvé sans vie. Personne n’a rien vu.`);
        break;
      }
      case 'mission_won': {
        const name = pseudoOf(event.actor_id);
        const title = str(d, 'title') ?? str(d, 'mission_title');
        if (name && title) timeline.push(`🎯 ${name} remporte la mission « ${title} ».`);
        break;
      }
      case 'phase_changed': {
        const to = str(d, 'to');
        if (to === 'nuit') {
          night += 1;
          timeline.push(`🌙 Nuit ${night} — Le village s’endort, la peur au ventre.`);
        }
        break;
      }
      case 'game_ended': {
        const winner = str(d, 'winner');
        timeline.push(
          winner === 'village'
            ? '🏆 Le village a purgé la menace : victoire du Village !'
            : winner === 'loups'
              ? '🐺 Les loups règnent sur les ruines du village : victoire des Loups !'
              : '🏁 La partie est terminée.'
        );
        break;
      }
      default:
        break;
    }
  }

  // ── Titres décernés ────────────────────────────────────────────────────────
  const titles: RecapTitle[] = [];

  const aliveWolves = players.filter((p) => p.team === 'loups' && p.isAlive);
  if (aliveWolves.length > 0) {
    titles.push({
      emoji: '🐺',
      label: 'Maître du bluff',
      value: aliveWolves.map((p) => p.pseudo).join(', '),
    });
  }

  const aliveVillagers = players.filter((p) => p.team !== 'loups' && p.isAlive);
  if (aliveWolves.length === 0 && aliveVillagers.length > 0) {
    titles.push({
      emoji: '🏅',
      label: 'Survivants du village',
      value: aliveVillagers.map((p) => p.pseudo).join(', '),
    });
  }

  if (firstVictim) {
    titles.push({ emoji: '💀', label: 'Première victime', value: firstVictim });
  }
  if (heartbreak) {
    titles.push({ emoji: '💔', label: 'Cœur brisé', value: heartbreak });
  }
  if (hunterName) {
    titles.push({ emoji: '🔫', label: 'Gâchette du crépuscule', value: hunterName });
  }
  if (mysteryDeath) {
    const assassin = players.find((p) => p.roleName === 'assassin');
    if (assassin) {
      titles.push({ emoji: '🗡️', label: 'La main invisible', value: assassin.pseudo });
    }
  }

  // Flair du village : le joueur dont les intuitions de nuit ont le plus
  // souvent visé un loup (rôles finaux — approximation assumée si trublion)
  const wolfIds = new Set(players.filter((p) => p.team === 'loups').map((p) => p.id));
  const hits = new Map<string, number>();
  for (const intuition of intuitions) {
    if (intuition.target_id && wolfIds.has(intuition.target_id)) {
      hits.set(intuition.voter_id, (hits.get(intuition.voter_id) ?? 0) + 1);
    }
  }
  let bestCount = 0;
  let bestIds: string[] = [];
  for (const [voterId, count] of hits) {
    if (count > bestCount) {
      bestCount = count;
      bestIds = [voterId];
    } else if (count === bestCount) {
      bestIds.push(voterId);
    }
  }
  if (bestCount > 0) {
    const names = bestIds.map((id) => byId.get(id)?.pseudo).filter(Boolean);
    if (names.length > 0) {
      titles.push({
        emoji: '🔮',
        label: 'Flair du village',
        value: `${names.join(', ')} (${bestCount} intuition${bestCount > 1 ? 's' : ''} juste${bestCount > 1 ? 's' : ''})`,
      });
    }
  }

  // Délit de faciès : verdict du procès d'avant-partie — le joueur le plus
  // accusé « tête de traître » au lobby, confronté à son rôle final
  const accusations = new Map<string, number>();
  for (const vote of procesVotes) {
    if (vote.target_id && byId.has(vote.target_id)) {
      accusations.set(vote.target_id, (accusations.get(vote.target_id) ?? 0) + 1);
    }
  }
  let topVotes = 0;
  let topIds: string[] = [];
  for (const [targetId, count] of accusations) {
    if (count > topVotes) {
      topVotes = count;
      topIds = [targetId];
    } else if (count === topVotes) {
      topIds.push(targetId);
    }
  }
  if (topVotes > 0 && topIds.length > 0) {
    const verdicts = topIds
      .map((id) => byId.get(id))
      .filter((p): p is RecapPlayer => Boolean(p))
      .map((p) => `${p.pseudo} ${p.team === 'loups' ? '🐺 coupable' : '🐑 innocenté'}`);
    if (verdicts.length > 0) {
      titles.push({
        emoji: '⚖️',
        label: 'Délit de faciès',
        value: `${verdicts.join(', ')} (${topVotes} accusation${topVotes > 1 ? 's' : ''} au procès)`,
      });
    }
  }

  return { timeline, titles };
}
