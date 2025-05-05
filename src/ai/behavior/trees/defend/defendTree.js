// 🌐 Shared Defend Tree (базовая логика защиты)

import { SelectorNode } from '../../nodes/selectorNode.js';
import { SequenceNode } from '../../nodes/sequenceNode.js';
import { ConditionNode } from '../../nodes/conditionNode.js';
import { ActionNode } from '../../nodes/actionNode.js';

import { isEnemyInRange } from '../../nodes/utils.js';

export function createDefendTree(unit, gameState) {
  return new SequenceNode([
    new ConditionNode(() => unit.canAct),

    new SelectorNode([
      new SequenceNode([
        new ConditionNode(() => isEnemyInRange(unit, gameState)()),
        new ActionNode(() => unit.retreatToSafeTile?.(gameState) || false)
      ]),
      new ActionNode(() => unit.canEnterNearestCity?.() || false),
      new ActionNode(() => unit.rest?.() || true)
    ])
  ]);
}
