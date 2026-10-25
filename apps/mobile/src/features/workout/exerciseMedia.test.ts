import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectSexSpecificVariant } from './exerciseMediaSelection';

const bundledExerciseAssets = resolve(__dirname, '../../../assets/exercises');

describe('sex-specific FitPulse media selection', () => {
  it.each(['pushup', 'pullup'] as const)('selects separate male/female variants for %s', (key) => {
    expect(selectSexSpecificVariant(key, 'male')).toEqual({ key, sex: 'male' });
    expect(selectSexSpecificVariant(key, 'female')).toEqual({ key, sex: 'female' });
  });

  it('defaults to the male render when profile sex is unset', () => {
    expect(selectSexSpecificVariant('pushup', null)).toEqual({ key: 'pushup', sex: 'male' });
    expect(selectSexSpecificVariant('pullup', undefined)).toEqual({ key: 'pullup', sex: 'male' });
  });

  it('does not override exercise media for other exercise keys', () => {
    expect(selectSexSpecificVariant('squat', 'female')).toBeNull();
    expect(selectSexSpecificVariant('plank', 'male')).toBeNull();
  });

  it.each(
    (['pushup', 'pullup'] as const).flatMap((key) =>
      (['male', 'female'] as const).flatMap((sex) => [
        [`fitpulse-${key}-${sex}.mp4`, 'mp4'],
        [`fitpulse-${key}-${sex}.jpg`, 'jpg']
      ])
    )
  )('ships a readable, non-empty `%s` asset', (filename, format) => {
    const absolutePath = resolve(bundledExerciseAssets, filename);
    expect(existsSync(absolutePath)).toBe(true);

    const bytes = readFileSync(absolutePath);
    expect(statSync(absolutePath).size).toBeGreaterThan(1000);

    if (format === 'jpg') {
      expect(bytes[0]).toBe(0xff);
      expect(bytes[1]).toBe(0xd8);
      expect(bytes[2]).toBe(0xff);
    } else {
      expect(bytes.subarray(4, 8).toString('ascii')).toBe('ftyp');
    }
  });
});
