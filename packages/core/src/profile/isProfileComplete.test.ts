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

test('age under 13 is not complete', () => {
  assert.equal(
    isProfileComplete({ weightKg: 78, heightCm: 178, age: 12, gender: 'male' }),
    false
  );
});

test('age over 120 is not complete', () => {
  assert.equal(
    isProfileComplete({ weightKg: 78, heightCm: 178, age: 121, gender: 'female' }),
    false
  );
});

test('boundary ages 13 and 120 are complete', () => {
  assert.equal(
    isProfileComplete({ weightKg: 78, heightCm: 178, age: 13, gender: 'male' }),
    true
  );
  assert.equal(
    isProfileComplete({ weightKg: 78, heightCm: 178, age: 120, gender: 'female' }),
    true
  );
});
