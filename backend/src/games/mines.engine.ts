import { getRandomFloat01 } from '../common/utils/provably-fair.util';

export interface MinesParams {
  rows: number;
  cols: number;
  minesCount: number;
}

export interface MinesGameData {
  rows: number;
  cols: number;
  minesCount: number;
  minePositions: number[]; // indices 0..(rows*cols-1)
  safeRevealed: number;
  finalMultiplier: number;
  hitMine: boolean;
}

export function resolveMinesBet(
  amount: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  params: MinesParams,
): MinesGameData {
  const totalCells = params.rows * params.cols;
  const minePositions = generateMinesPositions(
    totalCells,
    params.minesCount,
    serverSeed,
    clientSeed,
    nonce,
  );

  const maxSafe = totalCells - params.minesCount;
  const r = getRandomFloat01(serverSeed, clientSeed, nonce, 999);
  const safeRevealed = Math.floor(r * (maxSafe + 1)); // 0..maxSafe
  const hitMine = safeRevealed === 0;
  const finalMultiplier = hitMine
    ? 0
    : calculateMinesMultiplier(params.minesCount, safeRevealed, maxSafe);

  return {
    rows: params.rows,
    cols: params.cols,
    minesCount: params.minesCount,
    minePositions,
    safeRevealed,
    finalMultiplier,
    hitMine,
  };
}

export function generateMinesPositions(
  totalCells: number,
  minesCount: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number[] {
  const positions: Set<number> = new Set();
  let cursor = 0;
  while (positions.size < minesCount) {
    const r = getRandomFloat01(serverSeed, clientSeed, nonce, cursor++);
    const pos = Math.floor(r * totalCells);
    positions.add(pos);
  }
  return Array.from(positions).sort((a, b) => a - b);
}

export function calculateMinesMultiplier(
  minesCount: number,
  safeRevealed: number,
  maxSafe: number,
): number {
  if (safeRevealed <= 0) return 1.0;
  const riskFactor = 1 + minesCount / 5;
  const progress = safeRevealed / maxSafe;
  const progressFactor = 1 + Math.pow(progress, 2) * 5;
  const houseEdge = 0.98;
  const raw = riskFactor * progressFactor * houseEdge;
  return Number(raw.toFixed(4));
}


