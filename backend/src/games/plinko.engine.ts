import { getRandomFloat01 } from '../common/utils/provably-fair.util';

export type PlinkoRisk = 'low' | 'medium' | 'high';

export interface PlinkoParams {
  rows: number;
  risk: PlinkoRisk;
}

export interface PlinkoGameData {
  rows: number;
  risk: PlinkoRisk;
  path: ('L' | 'R')[];
  finalSlot: number;
  finalMultiplier: number;
}

const PLINKO_MULTIPLIERS: Record<PlinkoRisk, number[][]> = {
  low: [
    [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 1.3, 1.1, 1.0, 0.9, 0.7, 0.5],
  ],
  medium: [
    [0.3, 0.5, 0.8, 1.0, 1.3, 1.6, 2.0, 1.6, 1.3, 1.0, 0.8, 0.5, 0.3],
  ],
  high: [
    [0.2, 0.4, 0.7, 1.0, 1.5, 2.0, 3.0, 2.0, 1.5, 1.0, 0.7, 0.4, 0.2],
  ],
};

export function resolvePlinkoBet(
  amount: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  params: PlinkoParams,
): PlinkoGameData {
  const rows = params.rows;
  const risk = params.risk;
  const steps = rows;
  const path: ('L' | 'R')[] = [];
  let slot = 0;

  for (let i = 0; i < steps; i++) {
    const r = getRandomFloat01(serverSeed, clientSeed, nonce, i);
    const step: 'L' | 'R' = r < 0.5 ? 'L' : 'R';
    path.push(step);
    if (step === 'R') slot += 1;
  }

  const slotsCount = rows + 1;
  if (slot < 0) slot = 0;
  if (slot >= slotsCount) slot = slotsCount - 1;

  const tables = PLINKO_MULTIPLIERS[risk] || PLINKO_MULTIPLIERS.medium;
  const table = tables[0];
  const tableSlots = table.length;

  const mappedSlot = Math.min(
    tableSlots - 1,
    Math.round((slot / (slotsCount - 1)) * (tableSlots - 1)),
  );

  const baseMultiplier = table[mappedSlot];
  const finalMultiplier = Number(baseMultiplier.toFixed(4));

  return {
    rows,
    risk,
    path,
    finalSlot: mappedSlot,
    finalMultiplier,
  };
}


