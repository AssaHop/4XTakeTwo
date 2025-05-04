// 📁 src/ai/actions/moveActions.js

import { getClosestAttackableEnemy } from '../behavior/nodes/utils.js';

export function moveToClosestEnemy(unit, gameState) {
  const target = getClosestAttackableEnemy(unit, gameState);
  if (!target) return false;

  const path = gameState.findPath(unit, target);
  if (!path || path.length === 0) return false;

  const nextStep = path[0]; // только один шаг
  const success = unit.moveTo(nextStep.q, nextStep.r, nextStep.s);
  console.log(`🚶 ${unit.name} двигается к врагу ${target.name}`);
  return success;
}
