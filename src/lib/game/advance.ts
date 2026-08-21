/**
 * Avancement de phase côté serveur.
 *
 * Rejoue l'appel qu'enverrait un client Auto-Garou (résolution de nuit ou de
 * conseil, bascule jour → conseil) depuis le serveur lui-même. Utilisé par :
 * - le « prêt » unanime : le dernier prêt déclenche la transition, sans
 *   attendre qu'un téléphone se réveille ;
 * - le lazy tick : une lecture de l'état d'une partie dont le timer est
 *   expiré fait avancer la phase (les navigateurs mobiles gèlent les timers
 *   JS quand l'écran est verrouillé — le serveur, lui, ne dort pas).
 *
 * Passe par HTTP sur sa propre origine plutôt que par un import direct : les
 * routes de résolution portent toute la logique (verrou compris) et restent
 * l'unique chemin d'écriture.
 */

const TRANSITIONS: Record<'nuit' | 'jour' | 'conseil', { path: string; body: unknown }> = {
  nuit: { path: 'vote/night/resolve', body: { force: true } },
  jour: { path: 'phase', body: { phase: 'conseil' } },
  conseil: { path: 'vote/resolve', body: {} },
};

export async function triggerPhaseTransition(
  origin: string,
  code: string,
  status: 'nuit' | 'jour' | 'conseil'
): Promise<boolean> {
  const transition = TRANSITIONS[status];
  try {
    const res = await fetch(`${origin}/api/games/${code}/${transition.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transition.body),
    });
    // 409 = une résolution est déjà en cours (verrou) : la phase avance, tout va bien
    if (!res.ok && res.status !== 409) {
      console.error(
        `[advance] Transition ${status} refusée pour ${code} : HTTP ${res.status}`,
        await res.text().catch(() => '')
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[advance] Transition ${status} injoignable pour ${code} :`, error);
    return false;
  }
}
