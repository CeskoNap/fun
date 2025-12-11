import { getRandomFloat01 } from '../common/utils/provably-fair.util';

export type DiceDirection = 'over' | 'under';

export interface DiceParams {
  target: number; // Target number (1-100)
  direction: DiceDirection; // 'over' or 'under'
}

export interface DiceGameData {
  target: number;
  direction: DiceDirection;
  roll: number; // Result of the dice roll (1-100)
  won: boolean;
  finalMultiplier: number;
}

/**
 * Calculate multiplier based on win probability
 * Formula: multiplier = (100 - houseEdge) / winProbability
 * House edge is typically around 1-2%
 */
function calculateDiceMultiplier(winProbability: number, houseEdge: number = 0.01): number {
  if (winProbability <= 0 || winProbability >= 1) {
    return 0;
  }
  const multiplier = (1 - houseEdge) / winProbability;
  return Number(multiplier.toFixed(4));
}

export function resolveDiceBet(
  amount: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  params: DiceParams,
): DiceGameData {
  const { target, direction } = params;

  // Validate target (1-100)
  if (target < 1 || target > 100) {
    throw new Error('Target must be between 1 and 100');
  }

  // Generate dice roll (1-100)
  const r = getRandomFloat01(serverSeed, clientSeed, nonce, 0);
  const roll = Math.floor(r * 100) + 1; // 1-100

  // Determine win condition
  let won = false;
  let winProbability = 0;

  if (direction === 'over') {
    // Win if roll > target (e.g., target=50, win if roll 51-100)
    won = roll > target;
    // Probability of winning: (100 - target) / 100
    winProbability = (100 - target) / 100;
  } else if (direction === 'under') {
    // Win if roll < target (e.g., target=50, win if roll 1-49)
    won = roll < target;
    // Probability of winning: (target - 1) / 100
    winProbability = (target - 1) / 100;
  }

  // Calculate multiplier based on win probability
  const finalMultiplier = won ? calculateDiceMultiplier(winProbability) : 0;

  return {
    target,
    direction,
    roll,
    won,
    finalMultiplier,
  };
}



