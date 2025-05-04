// 🌐 Shared Attack Tree (простая стратегия)

import { SelectorNode } from '../../nodes/selectorNode.js';
import { SequenceNode } from '../../nodes/sequenceNode.js';
import { ConditionNode } from '../../nodes/conditionNode.js';
import { ActionNode } from '../../nodes/actionNode.js';

import {
  isEnemyInRange,
  isCapturableCityNearby,
  moveToClosestEnemy
} from '../../nodes/utils.js';

import { attackEnemyInRange } from '../../../actions/attackActions.js';
import { captureNearbyCity } from '../../../actions/captureActions.js';

export function createAttackTree(unit, gameState) {
  return new SelectorNode([
    new SequenceNode([
      new ConditionNode(isEnemyInRange(unit, gameState)),
      new ActionNode(attackEnemyInRange(unit, gameState))
    ]),
    new SequenceNode([
      new ConditionNode(isCapturableCityNearby(unit, gameState)),
      new ActionNode(captureNearbyCity(unit, gameState))
    ]),
    new ActionNode(moveToClosestEnemy(unit, gameState))
  ]);
}
