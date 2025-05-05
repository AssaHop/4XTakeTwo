import { FSMStates } from '../fsm/strategyManager.js';

// ATTACK
import { createAttackTree } from './trees/attack/attackTree.js';
import { createAttackWbbTree } from './trees/attack/attackWbb.js';

// DEFEND
import { createDefendTree } from './trees/defend/defendTree.js';
import { createDefendWbbTree } from './trees/defend/defendWbb.js';

/**
 * Возвращает поведенческое дерево на основе FSM-состояния и типа юнита.
 */
export function getBehaviorTreeForUnit(unit, gameState, fsmState) {
  switch (fsmState) {
    case FSMStates.ATTACK:
      switch (unit.type) {
        case 'WBB':
          console.log(`🎯 [BT] WBB uses ATTACK → attackWbb.js`);
          return createAttackWbbTree(unit, gameState);
        default:
          console.log(`🔁 [BT] ${unit.type} uses shared ATTACK → attackTree.js`);
          return createAttackTree(unit, gameState);
      }

    case FSMStates.DEFEND:
      switch (unit.type) {
        case 'WBB':
          console.log(`🎯 [BT] WBB uses DEFEND → defendWbb.js`);
          return createDefendWbbTree(unit, gameState);
        default:
          console.log(`🔁 [BT] ${unit.type} uses shared DEFEND → defendTree.js`);
          return createDefendTree(unit, gameState);
      }

    default:
      console.warn(`⚠️ [BT] Unknown FSM state (${fsmState}), fallback to shared ATTACK`);
      return createAttackTree(unit, gameState);
  }
}
