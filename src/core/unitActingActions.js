// 📂 src/core/unitActingActions.js

import { performAttack } from '../mechanics/units.js';
import { handlePostActingPhase } from './gameStateMachine.js';

const ActingActions = {
  Charge: (unit, target) => {
    if (!target) {
      console.warn(`⚠️ [Charge] No valid target! Skipping Charge action.`);
      return;
    }
    const result = performAttack(unit, target);
    console.log(`⚔️ [Charge Action] Attack result: ${result}`);
  },

  Boost: (unit) => {
    console.log(`✨ [Boost Action] Healing allies near unit ${unit.type}`);
    // Реализация Boost-эффекта
  },

  Percy: (unit) => {
    console.log(`🔁 [Percy Bonus] Checking kill streaks`);
    // Реализация бонуса на kill
  },

  Flee: (unit) => {
    console.log(`🏃 [Flee Action] Moving away`);
    // Реализация flee-движения
  },

  Recover: (unit) => {
    console.log(`🌀 [Recover Action] Regaining actions`);
    unit.actions = 1;
  },

  Explode: (unit) => {
    console.log(`💣 [Explode Action] Kaboom!`);
    // Реализация взрыва
  },

  Seize: (unit) => {
    console.log(`🏛️ [Seize Action] Attempting seize`);
    // Реализация Seize
  },

  Corrupt: (unit) => {
    console.log(`☣️ [Corrupt Action] Spreading corruption`);
    // Реализация Corrupt
  },

  Invade: (unit) => {
    console.log(`🛸 [Invade Action] Drone deploy on city`);
    // Реализация Invade
  }
};

function runActingAction(unit, target = null) {
  if (!unit.modules || unit.modules.length === 0) {
    handlePostActingPhase(unit);
    return;
  }

  for (const mod of unit.modules) {
    const action = ActingActions[mod];
    if (typeof action === 'function') {
      console.log(`⚙️ [UNIT_ACTING] Executing: ${mod}`);
      action(unit, target);
      break;
    }
  }

  handlePostActingPhase(unit); // ✅ Завершение ACTING
}

export { runActingAction };
