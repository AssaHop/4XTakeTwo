// 🎯 Поведение атаки для юнита WBB

import { SequenceNode } from '../../nodes/sequenceNode.js';
import { SelectorNode } from '../../nodes/selectorNode.js';
import { ConditionNode } from '../../nodes/conditionNode.js';
import { ActionNode } from '../../nodes/actionNode.js';

import { isEnemyInRange, isCapturableCityNearby } from '../../nodes/utils.js';
import { moveToClosestEnemy } from '../../../actions/moveActions.js';
import { attackEnemyInRange } from '../../../actions/attackActions.js';
import { captureNearbyCity } from '../../../actions/captureActions.js';

export function createAttackWbbTree(unit, gameState) {
  return new SequenceNode([
    new ConditionNode(() => unit.canAct),
    new SelectorNode([
      new SequenceNode([
        new ConditionNode(isEnemyInRange(unit, gameState)),
        new ActionNode(attackEnemyInRange(unit, gameState)),
        new ActionNode(() => {
          if (unit.canMove) return unit.retreatAfterAttack?.();
          return true;
        })
      ]),
      new SequenceNode([
        new ConditionNode(isCapturableCityNearby(unit, gameState)),
        new ActionNode(captureNearbyCity(unit, gameState))
      ]),
      new ActionNode(moveToClosestEnemy(unit, gameState))
    ])
  ]);
}