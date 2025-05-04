// 📁 src/ai/aiManager.js

import { getBehaviorTreeForUnit } from './behavior/behaviorFactory.js';
import { getCurrentFSMState } from './fsm/strategyManager.js';

export function runAIForTurn(gameState) {
  const aiUnits = gameState.getAIUnits?.() || [];

  // 1. Получить стратегическое состояние
  const fsmState = getCurrentFSMState(gameState); // например: ATTACK, DEFEND и т.д.
  console.log(`🧠 FSM Strategy: ${fsmState}`);

  // 2. Для каждого юнита — исполнить соответствующее дерево поведения
  aiUnits.forEach(unit => {
    if (!unit || unit.hp <= 0 || (!unit.canAct && !unit.canMove)) {
      console.log(`⏩ Skipping unit ${unit?.type} (exhausted/dead)`);
      return;
    }

    const tree = getBehaviorTreeForUnit(unit, gameState, fsmState);

    if (tree && tree.run) {
      console.log(`🌳 Executing tree for ${unit.type} at (${unit.q},${unit.r},${unit.s})`);
      console.log(`🧠 AI Decision tree for ${unit.type}:`, tree);
      tree.run();
    } else {
      console.warn(`❌ No tree found for unit ${unit.type}`);
    }
  });
}
