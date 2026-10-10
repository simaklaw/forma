import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requiresUnsupportedEquipment,
  translateName,
  slugify,
  categoryFor
} from './exerciseImportRules.mjs';

test('requiresUnsupportedEquipment: no equipment mentioned → false', () => {
  const ex = { instructions: ['Lie on the floor and lift your legs.'] };
  assert.equal(requiresUnsupportedEquipment(ex), false);
});

test('requiresUnsupportedEquipment: bench with no alternative → true', () => {
  const ex = { instructions: ['Lie on a flat bench and press the weight up.'] };
  assert.equal(requiresUnsupportedEquipment(ex), true);
});

test('requiresUnsupportedEquipment: bench with floor alternative → false', () => {
  const ex = {
    instructions: ['Lie on a bench or the floor and perform the movement.']
  };
  assert.equal(requiresUnsupportedEquipment(ex), false);
});

test('requiresUnsupportedEquipment: chair mentioned for balance only, no alt phrase → true', () => {
  // Documents CURRENT behaviour of the heuristic (chair hits UNSUPPORTED_EQUIPMENT).
  const ex = { instructions: ['Stand near a chair for balance if needed.'] };
  assert.equal(requiresUnsupportedEquipment(ex), true);
});

test('requiresUnsupportedEquipment: "may hold onto a chair" alternative phrase → false', () => {
  const ex = {
    instructions: ['Perform the squat. You may hold onto a chair for support.']
  };
  assert.equal(requiresUnsupportedEquipment(ex), false);
});

test('requiresUnsupportedEquipment: band anchor with standing-on-band alternative → false', () => {
  const ex = {
    instructions: [
      'Anchor the band to a rack. Alternatively, try standing on the band.'
    ]
  };
  assert.equal(requiresUnsupportedEquipment(ex), false);
});

test('translateName: exact match returns translation', () => {
  const dict = { 'Push-Up': 'Отжимания' };
  assert.equal(translateName('Push-Up', dict), 'Отжимания');
});

test('translateName: no match returns null, not a guess', () => {
  const dict = { 'Push-Up': 'Отжимания' };
  assert.equal(translateName('Completely Unknown Exercise', dict), null);
});

test('translateName: partial substring match does NOT auto-translate', () => {
  const dict = { Squat: 'Приседания' };
  assert.equal(translateName('Bulgarian Split Squat Jump', dict), null);
});

test('slugify: lowercases and replaces non-alphanumerics with dashes', () => {
  assert.equal(slugify('3/4 Sit-Up'), '3-4-sit-up');
});

test('slugify: strips leading/trailing dashes', () => {
  assert.equal(slugify('--Test--'), 'test');
});

test('categoryFor: first matching muscle wins', () => {
  const map = { chest: 'chest', triceps: 'arms' };
  assert.equal(categoryFor(['chest', 'triceps'], map), 'chest');
});

test('categoryFor: unmapped muscle falls back to abs default', () => {
  const map = { chest: 'chest' };
  assert.equal(categoryFor(['unknown-muscle'], map), 'abs');
});
