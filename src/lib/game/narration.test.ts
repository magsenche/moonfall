import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPhaseNarration, type NarrationEventRow } from './narration.ts';

const event = (
  event_type: string,
  data: Record<string, unknown> | null,
  created_at: string
): NarrationEventRow => ({ event_type, data, created_at });

describe('buildPhaseNarration', () => {
  it('jour : annonce la victime, son rôle et la cascade', () => {
    const lines = buildPhaseNarration('jour', 2, [
      event('hunter_shot', { hunter_name: 'Chloe', victim_name: 'Damien' }, '2026-01-01T00:00:02Z'),
      event('lover_heartbreak_death', { lover_name: 'Basile' }, '2026-01-01T00:00:01Z'),
      event('wolf_kill', { victim_name: 'Aline', victim_role: 'voyante' }, '2026-01-01T00:00:00Z'),
      event('council_results', { phase: 1 }, '2025-12-31T00:00:00Z'),
    ]);
    const text = lines.join(' ');
    assert.match(text, /Aline ne se réveillera plus/);
    assert.match(text, /une Voyante/);
    assert.match(text, /Basile meurt de chagrin/);
    assert.match(text, /Chloe abat Damien/);
  });

  it('jour sans victime : ne révèle jamais la cause du sauvetage', () => {
    const lines = buildPhaseNarration('jour', 3, [
      event('phase_change', { from: 'nuit', to: 'jour', salvateurSaved: true }, '2026-01-01T00:00:00Z'),
    ]);
    const text = lines.join(' ');
    assert.match(text, /[Pp]ersonne n'est mort|aucune victime|vide/i);
    assert.ok(!/salvateur/i.test(text), 'la cause du sauvetage reste secrète');
  });

  it('nuit : rappelle le verdict du conseil précédent puis endort le village', () => {
    const lines = buildPhaseNarration('nuit', 2, [
      event(
        'council_results',
        { phase: 1, eliminated: { pseudo: 'Hector', role: 'loup_garou' }, tie: false },
        '2026-01-01T00:00:00Z'
      ),
    ]);
    assert.match(lines[0], /Hector.*bûcher/);
    assert.match(lines[0], /Loup-Garou/);
    assert.match(lines[lines.length - 1], /🌙/);
  });

  it('nuit après égalité : personne ne brûle', () => {
    const lines = buildPhaseNarration('nuit', 3, [
      event('council_results', { phase: 2, eliminated: null, tie: true }, '2026-01-01T00:00:00Z'),
    ]);
    assert.match(lines[0], /pas su trancher/);
  });

  it('conseil : une ligne d\'ouverture, stable pour une même phase', () => {
    const a = buildPhaseNarration('conseil', 2, []);
    const b = buildPhaseNarration('conseil', 2, []);
    assert.equal(a.length, 1);
    assert.deepEqual(a, b);
  });

  it('nuit 1 : pas de verdict fantôme, juste l\'endormissement', () => {
    const lines = buildPhaseNarration('nuit', 1, []);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /🌙/);
  });
});
