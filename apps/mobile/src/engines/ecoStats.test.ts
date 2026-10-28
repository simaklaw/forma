import {
  CAR_EMISSION_G_PER_KM,
  ecoDistanceKmForCode,
  selectEcoSummary
} from './ecoStats';
import { toDateKey } from '@forma/core';

const NOW = new Date('2026-10-28T12:00:00');
const TODAY = toDateKey(NOW);

function keyDaysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return toDateKey(d);
}

describe('ecoDistanceKmForCode', () => {
  it('бодрая ходьба 60 мин → 5,5 км', () => {
    expect(ecoDistanceKmForCode('17190', 60)).toBeCloseTo(5.5);
  });

  it('бег ~10 км/ч 30 мин → 5 км', () => {
    expect(ecoDistanceKmForCode('12053', 30)).toBeCloseTo(5);
  });

  it('велосипед ~16–19 км/ч 45 мин → 13,125 км', () => {
    expect(ecoDistanceKmForCode('01020', 45)).toBeCloseTo(13.125);
  });

  it('велотренажёр — не эко-код (не заменяет поездку)', () => {
    expect(ecoDistanceKmForCode('02010', 60)).toBeNull();
  });

  it('быт и сидячая работа — не эко-коды', () => {
    expect(ecoDistanceKmForCode('05030', 60)).toBeNull();
    expect(ecoDistanceKmForCode('07010', 480)).toBeNull();
  });

  it('нулевая длительность → null', () => {
    expect(ecoDistanceKmForCode('17190', 0)).toBeNull();
  });

  it('неизвестный код → null', () => {
    expect(ecoDistanceKmForCode('99999', 30)).toBeNull();
  });
});

describe('selectEcoSummary', () => {
  it('ручной лог и импорт складываются', () => {
    const s = selectEcoSummary(
      [{ code: '17190', durationMin: 60, dateKey: TODAY }],
      [{ sport: 'running', distanceM: 5000, dateKey: TODAY }],
      7,
      NOW
    );
    expect(s.distanceKm).toBeCloseTo(10.5);
    expect(s.co2SavedKg).toBeCloseTo((10.5 * CAR_EMISSION_G_PER_KM) / 1000, 2);
    expect(s.activeDays).toBe(1);
  });

  it('окно 7 дней: 6-й день ещё в окне, 7-й — нет', () => {
    const s = selectEcoSummary(
      [
        { code: '17190', durationMin: 60, dateKey: keyDaysAgo(6) },
        { code: '17190', durationMin: 60, dateKey: keyDaysAgo(7) }
      ],
      [],
      7,
      NOW
    );
    expect(s.distanceKm).toBeCloseTo(5.5);
    expect(s.activeDays).toBe(1);
  });

  it('активности в разные дни считаются отдельными днями', () => {
    const s = selectEcoSummary(
      [
        { code: '17170', durationMin: 60, dateKey: TODAY },
        { code: '01015', durationMin: 60, dateKey: keyDaysAgo(1) }
      ],
      [],
      7,
      NOW
    );
    expect(s.distanceKm).toBeCloseTo(17);
    expect(s.activeDays).toBe(2);
  });

  it('импорт без дистанции пропускается', () => {
    const s = selectEcoSummary(
      [],
      [{ sport: 'cycling', dateKey: TODAY }],
      7,
      NOW
    );
    expect(s.distanceKm).toBe(0);
    expect(s.activeDays).toBe(0);
  });

  it('плавание и силовая не считаются эко-видами', () => {
    const s = selectEcoSummary(
      [],
      [
        { sport: 'swimming', distanceM: 2000, dateKey: TODAY },
        { sport: 'strength', distanceM: 5000, dateKey: TODAY }
      ],
      7,
      NOW
    );
    expect(s.distanceKm).toBe(0);
  });

  it('hiking — эко-вид', () => {
    const s = selectEcoSummary(
      [],
      [{ sport: 'hiking', distanceM: 8000, dateKey: TODAY }],
      7,
      NOW
    );
    expect(s.distanceKm).toBeCloseTo(8);
  });

  it('пустые данные → нули', () => {
    expect(selectEcoSummary([], [], 7, NOW)).toEqual({
      distanceKm: 0,
      co2SavedKg: 0,
      activeDays: 0
    });
  });

  it('округление дистанции до 0,1 км', () => {
    // 3 км/ч × 1 мин = 0.05 км → округляется к 0.1
    const s = selectEcoSummary(
      [{ code: '17170', durationMin: 1, dateKey: TODAY }],
      [],
      7,
      NOW
    );
    expect(s.distanceKm).toBeCloseTo(0.1);
  });
});
