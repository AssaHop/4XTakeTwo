  import { createAttackTree } from './trees/attackTree.js';
  //import { createDefenseTree } from './trees/defenseTree.js';
  //import { createExpandTree } from './trees/expandTree.js';
  //import { createEconomyTree } from './trees/economyTree.js';

  import { FSMStates } from '../fsm/strategyManager.js';

  export function getBehaviorTreeForUnit(unit, gameState, fsmState) {
    switch (fsmState) {
      case FSMStates.ATTACK:
        return createAttackTree(unit, gameState);
      //case FSMStates.DEFEND:
        //return createDefenseTree(unit, gameState);
      //case FSMStates.EXPAND:
        //return createExpandTree(unit, gameState);
      //case FSMStates.ECONOMY:
        //return createEconomyTree(unit, gameState);
      default:
        return createAttackTree(unit, gameState); // fallback
    }
  }
