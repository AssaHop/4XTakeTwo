// 📂 core/unitActingActions.js — финальная версия с Percy, Flee и логами

import { performAttack } from '../core/combatLogic.js';
import { handlePostActingPhase } from './gameStateMachine.js';
import { highlightUnitContext } from '../ui/highlightManager.js';

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
    console.log(`✨ [Boost Action] Buffing allies near ${unit.type} (not implemented)`);
  },

  Percy: (unit, target) => {
    console.log(`🔁 [Percy] Checking for bonus attack...`);
    if (unit.canRepeatAttackOnKill && target?.hp <= 0) {
      unit.actions = 1;
      console.log(`🔥 [Percy Triggered] Extra attack granted`);
      highlightUnitContext(unit); // Подсветка после убийства
    }
  },

  Flee: (unit) => {
    console.log(`🏃 [Flee Placeholder] Flee is handled in FSM. No direct action here.`);
  },

  Recover: (unit) => {
    console.log(`🌀 [Recover] Full action recovery`);
    unit.actions = 1;
  },

  Explode: (unit) => {
    console.log(`💣 [Explode] Explosion not implemented`);
  },

  Seize: (unit) => {
    console.log(`🏛️ [Seize] Capturing mechanic not implemented`);
  },

  Corrupt: (unit) => {
    console.log(`☣️ [Corrupt] Effect spread not implemented`);
  },

  Invade: (unit) => {
    console.log(`🛸 [Invade] Drone deploy not implemented`);
  }
};

function runActingAction(unit, target = null) {
  if (!unit.modules || unit.modules.length === 0) {
    handlePostActingPhase(unit);
    return;
  }

  console.log(`⚙️ [UNIT_ACTING] Executing actions for ${unit.type}...`);
  let grantedExtraAction = false;

  for (const mod of unit.modules) {
    const action = ActingActions[mod];
    if (typeof action === 'function') {
      console.log(`▶️ Running module action: ${mod}`);
      const before = unit.actions;
      action(unit, target);

      if (unit.actions > before) {
        grantedExtraAction = true;
      }
    }
  }

  if (!grantedExtraAction) {
    console.log('⏹️ No extra actions — finishing acting phase');
    handlePostActingPhase(unit);
  } else {
    console.log('🔁 Extra action granted — unit stays active');
  }
}

export { runActingAction };
