import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classicComposition } from './composition.ts';

const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);

describe('classicComposition', () => {
  it('8 joueurs = le starter du jeu de cartes (2 loups, voyante, sorcière, chasseur)', () => {
    assert.deepEqual(classicComposition(8), {
      loup_garou: 2,
      voyante: 1,
      sorciere: 1,
      chasseur: 1,
      villageois: 3,
    });
  });

  it('petites tables : rôles introduits progressivement', () => {
    assert.deepEqual(classicComposition(3), { loup_garou: 1, villageois: 2 });
    assert.deepEqual(classicComposition(4), { loup_garou: 1, voyante: 1, villageois: 2 });
    assert.deepEqual(classicComposition(6), {
      loup_garou: 1,
      voyante: 1,
      sorciere: 1,
      villageois: 3,
    });
  });

  it('grandes tables : 3 loups à partir de 12', () => {
    assert.equal(classicComposition(11).loup_garou, 2);
    assert.equal(classicComposition(12).loup_garou, 3);
  });

  it('le total vaut toujours le nombre de joueurs et jamais de compte négatif', () => {
    for (let n = 3; n <= 20; n++) {
      const c = classicComposition(n);
      assert.equal(total(c), n, `total pour ${n} joueurs`);
      for (const [role, count] of Object.entries(c)) {
        assert.ok(count >= 0, `${role} >= 0 pour ${n} joueurs`);
      }
    }
  });

  it('les loups restent minoritaires au départ', () => {
    for (let n = 3; n <= 20; n++) {
      const c = classicComposition(n);
      assert.ok(c.loup_garou < n - c.loup_garou, `loups minoritaires pour ${n} joueurs`);
    }
  });
});
