import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectGymCsvFormat, parseGymCsv, parseHevyCsv, parseStrongCsv } from './parseGymCsv.ts';

const HEVY = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
"Chest Day","28 Mar 2025, 17:29","28 Mar 2025, 18:10","","Bench Press","","",1,normal,60,8,,,
"Chest Day","28 Mar 2025, 17:29","28 Mar 2025, 18:10","","Bench Press","","",2,normal,62.5,6,,,
"Chest Day","28 Mar 2025, 17:29","28 Mar 2025, 18:10","","Bench Press","","",3,failure,60,3,,,,
Pull Day,2025-03-29T10:00:00Z,2025-03-29T10:45:00Z,,Pull Ups,,,1,normal,,10,,,7
Pull Day,2025-03-29T10:00:00Z,2025-03-29T10:45:00Z,,Deadlift,,,1,normal,"135",5,,,8.5`;

const HEVY_LBS = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_lbs,reps,distance_miles,duration_seconds,rpe
Legs,2025-04-01T09:00:00Z,2025-04-01T10:00:00Z,,Squat,,,1,normal,135,5,,,`;

const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2020-12-30 18:51:52,Full Body,01:01:10,Squat,1,100,8,,90,,,8
2020-12-30 18:51:52,Full Body,01:01:10,Squat,2,102.5,6,,90,,,
2020-12-30 18:51:52,Full Body,01:01:10,Squat,Rest Timer,,,90,,90,,,
2020-12-30 18:51:52,Full Body,01:01:10,Pushup,1,,20,,60,,,
2020-12-30 18:51:52,Full Body,01:01:10,Pushup,2,,15,,60,,`;

const STRONG_SEMI = `"Workout #";"Date";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE"
"1";"2021-01-05 19:20:33";"Bench Press";"1";"80";"5";"9"
"1";"2021-01-05 19:20:33";"Bench Press";"2";"80";"5";""`;

const STRONG_OLD = `"Workout Name";"Date";"Exercise Name";"Set Order";"Weight";"Weight Unit";"Reps";"RPE"
"Push";"2021-02-10 08:00:00";"OHP";"1";"100";"lb";"6";""
"Push";"2021-02-10 08:00:00";"OHP";"2";"45";"kg";"8";"10"`;

describe('detectGymCsvFormat', () => {
  it('recognizes hevy and strong headers and rejects unknown csv', () => {
    assert.equal(detectGymCsvFormat(HEVY), 'hevy');
    assert.equal(detectGymCsvFormat(STRONG), 'strong');
    assert.equal(detectGymCsvFormat(STRONG_SEMI), 'strong');
    assert.equal(detectGymCsvFormat('a,b,c\n1,2,3'), null);
  });
});

describe('parseGymCsv', () => {
  it('dispatches by detected format and throws on unknown csv', () => {
    assert.equal(parseGymCsv(HEVY).format, 'hevy');
    assert.equal(parseGymCsv(STRONG_SEMI).format, 'strong');
    assert.throws(() => parseGymCsv('a,b,c\n1,2,3'), /Формат CSV не распознан/);
  });
});

describe('parseHevyCsv', () => {
  it('parses quoted dates weights rpe and workout names', () => {
    const r = parseHevyCsv(HEVY);
    assert.equal(r.format, 'hevy');
    assert.equal(r.sets.length, 5);
    assert.deepEqual(r.sets[0], {
      exerciseName: 'Bench Press',
      workoutName: 'Chest Day',
      dateKey: '2025-03-28',
      setIndex: 1,
      weightKg: 60,
      reps: 8,
      rir: 2,
      setType: 'normal',
      supersetId: undefined,
    });
    assert.equal(r.sets[1]!.weightKg, 62.5);
    // failure без RPE → RIR 0.
    assert.equal(r.sets[2]!.rir, 0);
    assert.equal(r.sets[2]!.setType, 'failure');
    // Пустой вес — собственный вес; RPE 7 → RIR 3.
    assert.equal(r.sets[3]!.weightKg, 0);
    assert.equal(r.sets[3]!.reps, 10);
    assert.equal(r.sets[3]!.rir, 3);
    // RPE 8.5 → Math.round(8.5) = 9 → RIR 1.
    assert.equal(r.sets[4]!.rir, 1);
    assert.equal(r.sets[4]!.weightKg, 135);
    assert.equal(r.warnings.length, 0);
  });

  it('converts weight_lbs to kilograms', () => {
    const r = parseHevyCsv(HEVY_LBS);
    assert.equal(r.sets.length, 1);
    assert.equal(r.sets[0]!.weightKg, 61.23);
    assert.equal(r.sets[0]!.rir, 2);
  });

  it('skips rows with invalid dates and reports a warning', () => {
    const bad = HEVY.replace('2025-03-29T10:00:00Z,2025-03-29T10:45:00Z,,Pull Ups', 'not-a-date,,x,Pull Ups');
    const r = parseHevyCsv(bad);
    assert.equal(r.sets.length, 4);
    assert.equal(r.warnings.length, 1);
    assert.match(r.warnings[0]!, /Hevy: пропущено строк/);
  });

  it('keeps multiline quoted fields from breaking rows', () => {
    const ml = `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
W,2025-05-01T10:00:00Z,2025-05-01T11:00:00Z,"много
строчное описание",Row,,,1,normal,50,12,,,`;
    const r = parseHevyCsv(ml);
    assert.equal(r.sets.length, 1);
    assert.equal(r.sets[0]!.exerciseName, 'Row');
    assert.equal(r.sets[0]!.reps, 12);
  });
});

describe('parseStrongCsv', () => {
  it('parses the current comma format and skips rest timers', () => {
    const r = parseStrongCsv(STRONG);
    assert.equal(r.format, 'strong');
    assert.equal(r.sets.length, 4);
    assert.equal(r.sets[0]!.dateKey, '2020-12-30');
    assert.equal(r.sets[0]!.workoutName, 'Full Body');
    assert.equal(r.sets[0]!.setIndex, 1);
    assert.equal(r.sets[0]!.weightKg, 100);
    assert.equal(r.sets[0]!.rir, 2);
    // Пустая RPE → RIR по умолчанию.
    assert.equal(r.sets[1]!.rir, 2);
    // Пустой вес — собственный вес.
    assert.equal(r.sets[2]!.weightKg, 0);
    assert.equal(r.sets[2]!.reps, 20);
  });

  it('parses the 6.2.4 semicolon format with weight in kg', () => {
    const r = parseStrongCsv(STRONG_SEMI);
    assert.equal(r.sets.length, 2);
    assert.equal(r.sets[0]!.weightKg, 80);
    assert.equal(r.sets[0]!.rir, 1);
    assert.equal(r.sets[0]!.workoutName, 'Workout 1');
  });

  it('converts lb rows via the weight unit column', () => {
    const r = parseStrongCsv(STRONG_OLD);
    assert.equal(r.sets.length, 2);
    assert.equal(r.sets[0]!.weightKg, 45.36);
    assert.equal(r.sets[1]!.weightKg, 45);
    assert.equal(r.sets[1]!.rir, 0);
  });
});

describe('parseHevyCsv set types and supersets', () => {
  it('parses set_type and superset_id columns', () => {
    const csv = [
      'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe',
      'Sup,2025-06-01T10:00:00Z,2025-06-01T10:30:00Z,,Bench Press,abc-1,,1,warmup,40,10,,,',
      'Sup,2025-06-01T10:00:00Z,2025-06-01T10:30:00Z,,Bench Press,abc-1,,2,normal,80,8,,,',
      'Sup,2025-06-01T10:00:00Z,2025-06-01T10:30:00Z,,Bench Press,,,3,dropset,50,12,,,'
    ].join('\n');
    const r = parseHevyCsv(csv);
    assert.equal(r.sets.length, 3);
    assert.equal(r.sets[0]!.setType, 'warmup');
    assert.equal(r.sets[0]!.supersetId, 'abc-1');
    assert.equal(r.sets[1]!.setType, 'normal');
    assert.equal(r.sets[2]!.setType, 'dropset');
    assert.equal(r.sets[2]!.supersetId, undefined);
  });
});

