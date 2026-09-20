import assert from 'node:assert/strict';
import test from 'node:test';
import { isProfileComplete } from './isProfileComplete.ts';

test('incomplete weight is not complete', () => {
  assert.equal(
    isProfileComplete({ weightKg: null, heightCm: 178, age: 28, gender: 'male' }),
    false
  );
});

test('full profile is complete', () => {
  assert.equal(
    isProfileComplete({ weightKg: 78, heightCm: 178, age: 28, gender: 'male' }),
    true
  );
});

test('zero weight is not complete', () => {
  assert.equal(
    isProfileComplete({ weightKg: 0, heightCm: 178, age: 28, gender: 'male' }),
    false
  );
});
