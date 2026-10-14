/** Classic Tabata (Izumi Tabata): 20s work / 10s rest × 8 rounds. */

export type TabataPhase = 'idle' | 'prepare' | 'work' | 'rest' | 'done';

export interface TabataConfig {
  /** Seconds before first work interval */
  prepareSec: number;
  workSec: number;
  restSec: number;
  rounds: number;
}

export const CLASSIC_TABATA: TabataConfig = {
  prepareSec: 10,
  workSec: 20,
  restSec: 10,
  rounds: 8
};

/** Fat-loss style: slightly longer work, same structure. */
export const FAT_BURN_TABATA: TabataConfig = {
  prepareSec: 10,
  workSec: 30,
  restSec: 10,
  rounds: 8
};

export function totalSessionSeconds(c: TabataConfig): number {
  return c.prepareSec + c.rounds * (c.workSec + c.restSec) - c.restSec;
}
