import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  basePointsForDifficulty,
  computeReadiness,
  computeWinner,
  isAutoMode,
  isBotPseudo,
  tallyVotes,
  type ReadinessPlayer,
  type VictoryPlayer,
} from './resolution.ts';

const player = (team: VictoryPlayer['team'], isAlive = true, isMj = false): VictoryPlayer => ({
  team,
  isAlive,
  isMj,
});

describe('computeWinner', () => {
  it('village gagne quand plus aucun loup n\'est vivant', () => {
    const players = [player('loups', false), player('village'), player('village')];
    assert.equal(computeWinner(players, true), 'village');
  });

  it('loups gagnent à parité', () => {
    const players = [player('loups'), player('village')];
    assert.equal(computeWinner(players, true), 'loups');
  });

  it('personne ne gagne tant que les loups sont vivants et minoritaires', () => {
    const players = [player('loups'), player('village'), player('village')];
    assert.equal(computeWinner(players, true), null);
  });

  it('les rôles solo comptent comme non-loups', () => {
    const players = [player('loups'), player('solo'), player('village')];
    assert.equal(computeWinner(players, true), null);
  });

  it('mode normal : le MJ arbitre est hors décompte', () => {
    const players = [player('loups'), player('village'), player(null, true, true)];
    assert.equal(computeWinner(players, false), 'loups');
  });

  it('mode Auto-Garou : le MJ joueur compte dans les effectifs', () => {
    const players = [player('loups'), player('village'), player('village', true, true)];
    assert.equal(computeWinner(players, true), null);
  });

  it('un MJ loup vivant empêche la victoire du village en Auto-Garou', () => {
    const players = [player('loups', true, true), player('village'), player('village')];
    assert.equal(computeWinner(players, true), null);
    assert.equal(computeWinner(players, false), 'village');
  });
});

describe('tallyVotes', () => {
  it('compte les votes et désigne le leader', () => {
    const tally = tallyVotes([
      { voter_id: 'v1', target_id: 'a' },
      { voter_id: 'v2', target_id: 'a' },
      { voter_id: 'v3', target_id: 'b' },
    ]);
    assert.deepEqual(tally.counts, { a: 2, b: 1 });
    assert.equal(tally.max, 2);
    assert.deepEqual(tally.leaders, ['a']);
  });

  it('détecte une égalité en tête', () => {
    const tally = tallyVotes([
      { voter_id: 'v1', target_id: 'a' },
      { voter_id: 'v2', target_id: 'b' },
    ]);
    assert.equal(tally.max, 1);
    assert.deepEqual([...tally.leaders].sort(), ['a', 'b']);
  });

  it('ignore les votes blancs', () => {
    const tally = tallyVotes([
      { voter_id: 'v1', target_id: null },
      { voter_id: 'v2', target_id: 'a' },
    ]);
    assert.deepEqual(tally.counts, { a: 1 });
    assert.deepEqual(tally.leaders, ['a']);
  });

  it('aucun vote exprimé → aucun leader', () => {
    const tally = tallyVotes([{ voter_id: 'v1', target_id: null }]);
    assert.equal(tally.max, 0);
    assert.deepEqual(tally.leaders, []);
  });

  it('applique le poids du double vote', () => {
    const tally = tallyVotes(
      [
        { voter_id: 'double', target_id: 'a' },
        { voter_id: 'v2', target_id: 'b' },
      ],
      (voterId) => (voterId === 'double' ? 2 : 1)
    );
    assert.deepEqual(tally.counts, { a: 2, b: 1 });
    assert.deepEqual(tally.leaders, ['a']);
  });
});

describe('basePointsForDifficulty', () => {
  it('1-5 étoiles = 2-10 points', () => {
    assert.equal(basePointsForDifficulty(1), 2);
    assert.equal(basePointsForDifficulty(3), 6);
    assert.equal(basePointsForDifficulty(5), 10);
  });

  it('borne les difficultés hors plage et les valeurs absentes', () => {
    assert.equal(basePointsForDifficulty(0), 2);
    assert.equal(basePointsForDifficulty(9), 10);
    assert.equal(basePointsForDifficulty(null), 2);
    assert.equal(basePointsForDifficulty(undefined), 2);
  });
});

describe('computeReadiness', () => {
  const rp = (id: string, pseudo: string, isAlive = true): ReadinessPlayer => ({ id, pseudo, isAlive });
  const table = [
    rp('h1', 'Aline'),
    rp('h2', 'Basile'),
    rp('h3', 'Chloe', false), // morte : ne compte pas
    rp('b1', '🤖 Alice'), // bot : ne compte pas
  ];

  it('seuls les humains vivants comptent dans l\'unanimité', () => {
    assert.deepEqual(computeReadiness(table, ['h1']), {
      readyCount: 1,
      totalHumans: 2,
      allReady: false,
    });
    assert.deepEqual(computeReadiness(table, ['h1', 'h2']), {
      readyCount: 2,
      totalHumans: 2,
      allReady: true,
    });
  });

  it('les prêts des morts et des bots sont ignorés', () => {
    const r = computeReadiness(table, ['h3', 'b1']);
    assert.equal(r.readyCount, 0);
    assert.equal(r.allReady, false);
  });

  it('aucun humain vivant → jamais prêt (parties 100 % bots au timer)', () => {
    const bots = [rp('b1', '🤖 Alice'), rp('b2', '🤖 Bob')];
    assert.equal(computeReadiness(bots, ['b1', 'b2']).allReady, false);
  });

  it('isBotPseudo reconnaît le préfixe 🤖', () => {
    assert.equal(isBotPseudo('🤖 Alice'), true);
    assert.equal(isBotPseudo('Aline'), false);
  });
});

describe('isAutoMode', () => {
  it('true uniquement quand settings.autoMode === true', () => {
    assert.equal(isAutoMode({ autoMode: true }), true);
    assert.equal(isAutoMode({ autoMode: false }), false);
    assert.equal(isAutoMode({}), false);
    assert.equal(isAutoMode(null), false);
    assert.equal(isAutoMode(undefined), false);
  });
});
