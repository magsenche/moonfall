import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecap, type RecapEventRow, type RecapPlayer } from './recap.ts';

const players: RecapPlayer[] = [
  { id: 'p1', pseudo: 'Aline', roleName: 'loup_garou', team: 'loups', isAlive: true },
  { id: 'p2', pseudo: 'Basile', roleName: 'villageois', team: 'village', isAlive: false },
  { id: 'p3', pseudo: 'Chloe', roleName: 'chasseur', team: 'village', isAlive: false },
  { id: 'p4', pseudo: 'Damien', roleName: 'assassin', team: 'solo', isAlive: true },
];

const event = (
  event_type: string,
  data: Record<string, unknown> | null = null,
  extra?: Partial<RecapEventRow>
): RecapEventRow => ({ event_type, data, actor_id: null, target_id: null, ...extra });

describe('buildRecap', () => {
  it('raconte une partie complète dans l\'ordre', () => {
    const { timeline } = buildRecap(
      [
        event('game_started', { player_count: 8, wolf_count: 2 }),
        event('wolf_kill', { victim_name: 'Basile', victim_role: 'villageois' }),
        event('player_eliminated', { pseudo: 'Chloe', votes: 5 }),
        event('phase_changed', { to: 'nuit' }),
        event('game_ended', { winner: 'loups' }),
      ],
      players
    );
    assert.equal(timeline.length, 5);
    assert.match(timeline[0], /8 joueurs.*2 loups/);
    assert.match(timeline[1], /Basile.*dévoré/);
    assert.match(timeline[2], /Conseil 1.*Chloe.*5 voix/);
    assert.match(timeline[3], /Nuit 2/);
    assert.match(timeline[4], /victoire des Loups/);
  });

  it('numérote les nuits et les conseils', () => {
    const { timeline } = buildRecap(
      [
        event('game_started', { player_count: 6, wolf_count: 1 }),
        event('player_eliminated', { pseudo: 'A' }),
        event('phase_changed', { to: 'nuit' }),
        event('player_eliminated', { pseudo: 'B' }),
        event('phase_changed', { to: 'nuit' }),
      ],
      players
    );
    assert.match(timeline[2], /Nuit 2/);
    assert.match(timeline[3], /Conseil 2/);
    assert.match(timeline[4], /Nuit 3/);
  });

  it('résout les pseudos depuis actor_id/target_id (immunité, assassinat)', () => {
    const { timeline } = buildRecap(
      [
        event('immunity_used', {}, { actor_id: 'p1' }),
        event('player_killed', { mystery: true }, { target_id: 'p2' }),
      ],
      players
    );
    assert.match(timeline[0], /Aline.*immunité/);
    assert.match(timeline[1], /Basile.*sans vie/);
  });

  it('décerne les titres : bluff, première victime, chagrin, chasseur, assassin', () => {
    const { titles } = buildRecap(
      [
        event('wolf_kill', { victim_name: 'Basile' }),
        event('lover_heartbreak_death', { lover_name: 'Chloe' }),
        event('hunter_shot', { hunter_name: 'Chloe', victim_name: 'Damien' }),
        event('player_killed', {}, { target_id: 'p2' }),
      ],
      players
    );
    const byLabel = new Map(titles.map((t) => [t.label, t.value]));
    assert.equal(byLabel.get('Maître du bluff'), 'Aline');
    assert.equal(byLabel.get('Première victime'), 'Basile');
    assert.equal(byLabel.get('Cœur brisé'), 'Chloe');
    assert.equal(byLabel.get('Gâchette du crépuscule'), 'Chloe');
    assert.equal(byLabel.get('La main invisible'), 'Damien');
  });

  it('village vainqueur : survivants du village au lieu du bluff', () => {
    const villageWin: RecapPlayer[] = players.map((p) =>
      p.team === 'loups' ? { ...p, isAlive: false } : p
    );
    const { titles } = buildRecap([], villageWin);
    const labels = titles.map((t) => t.label);
    assert.ok(labels.includes('Survivants du village'));
    assert.ok(!labels.includes('Maître du bluff'));
  });

  it('ignore les événements inconnus sans casser', () => {
    const { timeline } = buildRecap(
      [event('shop_purchase', { item_name: 'x' }), event('points_earned', { points: 3 })],
      players
    );
    assert.equal(timeline.length, 0);
  });
});
