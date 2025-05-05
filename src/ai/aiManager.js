// 📁 src/ai/aiManager.js

import { createAttackWbbTree } from './behavior/trees/attack/attackWbb.js';

// 🔍 Фильтрация AI-юнитов
function getAIUnits(units) {
  return units.filter(u => u.owner?.startsWith('enemy'));
}

/**
 * 📦 Основной обработчик хода AI
 */
export async function runAIForTurn(gameState) {
  const aiUnits = getAIUnits(gameState.units);
  console.log('🧳 AI Units found:', aiUnits.length);

  for (const unit of aiUnits) {
    console.log(`🔍 ${unit.type} at (${unit.q},${unit.r},${unit.s}) | owner=${unit.owner} | HP=${unit.hp}/${unit.maxHp} | act=${unit.canAct}, move=${unit.canMove}`);

    const fsm = unit.fsm || 'ATTACK';
    console.log('🧠 FSM Strategy:', fsm);

    let tree = null;
    switch (fsm) {
      case 'ATTACK':
      default:
        tree = createAttackWbbTree(unit, gameState);
        break;
    }

    if (tree) {
      console.log(`🌳 Executing tree for ${unit.type} at (${unit.q},${unit.r},${unit.s}) [FSM: ${fsm}]`);
      console.log('📦 Tree type:', tree.constructor.name);
      console.log('📍 [AI] Tree instance:', tree);
      console.log('🧠 [AI] WBB HP:', unit.hp + '/' + unit.maxHp);

      await tree.run();
    }
  }
} 
