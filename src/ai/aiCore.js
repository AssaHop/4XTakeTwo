// 📁 src/ai/aiCore.js

import { decideUnitBehavior } from './aiBehaviors.js';
import { performAttack } from '../core/combatLogic.js';

export function runAIForUnit(unit, gameState) {
  const behavior = decideUnitBehavior(unit, gameState);

  if (!behavior) return;

  const { type, target, path } = behavior;

  if (type === 'attack' && target) {
    performAttack(unit, target);
    return;
  }

  if (type === 'move' && path?.length > 0) {
    const dest = path[0];
    unit.moveTo(dest.q, dest.r, dest.s);
  }
}
