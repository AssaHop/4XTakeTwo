import { state } from '../core/state.js';
import { performAttack, canAttack } from '../core/combatLogic.js';
import { findPath } from '../mechanics/pathfinding.js';

function runAiTurn() {
  if (state.enemyQueueIndex >= state.enemyQueue.length) {
    console.log('✅ AI turn complete');
    state.enemyQueue = [];
    state.enemyQueueIndex = 0;
    return;
  }

  const unit = state.enemyQueue[state.enemyQueueIndex];
  console.log(`\n🤖 [AI Step] ${state.enemyQueueIndex + 1}/${state.enemyQueue.length}`);
  console.log(`🔍 [Unit] ${unit.type} @ (${unit.q},${unit.r},${unit.s})`);
  console.log(`⚙️ Flags → canMove: ${unit.canMove}, canAct: ${unit.canAct}`);

  // 1. ATTACK if possible
  const targets = state.units.filter(u => u.owner !== unit.owner && canAttack(unit, u));
  if (targets.length > 0) {
    console.log(`🎯 [AI] Target in range: ${targets[0].type} @ (${targets[0].q},${targets[0].r},${targets[0].s})`);
    performAttack(unit, targets[0]);
    state.enemyQueueIndex++;
    setTimeout(runAiTurn, 200);
    return;
  }

  // 2. MOVE toward nearest target
  const enemies = state.units.filter(u => u.owner !== unit.owner);
  const target = enemies[0];

  if (!target || typeof target.q !== 'number') {
    console.warn(`[AI] Skipping movement: invalid target`);
    state.enemyQueueIndex++;
    setTimeout(runAiTurn, 200);
    return;
  }

  try {
    const path = findPath(unit, target, state.mapIndex, unit);
    if (Array.isArray(path) && path.length > 1) {
      const reachable = unit.getAvailableHexes();

      const nextStep = path.find(p =>
        reachable.some(h => h.q === p.q && h.r === p.r && h.s === p.s)
      );

      if (nextStep) {
        const moved = unit.moveTo(nextStep.q, nextStep.r, nextStep.s);
        if (moved) {
          console.log(`🏃 [AI] ${unit.type} moves to (${nextStep.q},${nextStep.r},${nextStep.s})`);
          state.enemyQueueIndex++;
          setTimeout(runAiTurn, 200);
          return;
        }
      } else {
        console.warn(`[AI] No reachable step found in path`);
      }
    } else {
      console.warn('[AI] No valid path to target');
    }
  } catch (err) {
    console.error('[AI] 💥 Error during pathfinding:', err);
  }

  // 3. NO ACTIONS
  console.warn(`[AI] ${unit.type} had no valid actions`);
  state.enemyQueueIndex++;
  setTimeout(runAiTurn, 200);
}

function validateMapIntegrity() {
  if (!state.mapIndex || Object.keys(state.mapIndex).length === 0) {
    console.error('❌ [MAP] mapIndex is missing or empty!');
    return false;
  }

  const malformed = Object.entries(state.mapIndex).filter(([_, tile]) =>
    typeof tile.q !== 'number' || typeof tile.r !== 'number' || typeof tile.s !== 'number' || !tile.terrainType
  );

  if (malformed.length > 0) {
    console.warn(`⚠️ [MAP] Found ${malformed.length} malformed tiles`, malformed.slice(0, 3));
    return false;
  }

  return true;
}

function runAIForAllUnits() {
  console.log('🧠 AI phase started...');
  if (!validateMapIntegrity()) {
    console.error('🛑 [AI] Map is broken. Turn skipped.');
    return;
  }

  runAiTurn();
}

export { runAIForAllUnits };
