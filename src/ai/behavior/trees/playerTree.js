// 📁 src/ai/behavior/trees/playerTree.js

import { SequenceNode } from '../nodes/sequenceNode.js';
import { ConditionNode } from '../nodes/conditionNode.js';
import { ActionNode } from '../nodes/actionNode.js';

import { highlightUnitContext } from '../../../ui/highlightManager.js';
import { Unit } from '../../../mechanics/units.js';

export function createPlayerTree(unit, gameState) {
  return new SequenceNode([
    new ConditionNode(() => unit.hp > 0),
    new ActionNode(() => {
      highlightUnitContext(unit); // 👈 подсветка после выбора
      return true;
    }),
    new ActionNode(() => {
      // можно встроить интерактивные Action'ы (GUI?)
      console.log(`🎮 [BT] Player unit ${unit.type} is ready`);
      return true;
    })
  ]);
}
  