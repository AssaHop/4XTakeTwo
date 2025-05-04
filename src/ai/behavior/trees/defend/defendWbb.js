import { SequenceNode } from '../../nodes/sequenceNode.js';
import { SelectorNode } from '../../nodes/selectorNode.js';
import { ConditionNode } from '../../nodes/conditionNode.js';
import { ActionNode } from '../../nodes/actionNode.js';

import { isEnemyInRange } from '../../nodes/utils.js';

export function createDefendWbbTree(unit, gameState) {
  return new SequenceNode([
    new ConditionNode(() => unit.canAct),

    new SelectorNode([
      // 🏃 Отступить, если HP < 50%
      new SequenceNode([
        new ConditionNode(() => unit.hp < unit.maxHp * 0.5),
        new ActionNode(() => {
          console.log(`⚠️ [WBB] Мало HP — отступает`);
          return unit.retreatToSafeTile?.(gameState) || false;
        })
      ]),

      // 🧱 Иначе держим позицию
      new ActionNode(() => {
        console.log(`🛡 [WBB] Держит оборону`);
        return true;
      })
    ])
  ]);
}
