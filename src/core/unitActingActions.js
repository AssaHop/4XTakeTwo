// 📂 core/unitActingActions.js — адаптировано под FSM

import { performAttack } from '../core/combatLogic.js';
import { evaluatePostAction } from './gameStateMachine.js';

const ActingActions = {
  Charge: (unit, target) => {
    if (!target) {
      console.warn(`⚠️ [Charge] No valid target! Skipping Charge action.`);
      return;
    }
    console.log(`⚔️ [Charge Action] Performing attack`);
    performAttack(unit, target);
  },

  Boost: (unit) => {
    console.log(`✨ [Boost Action] Buffing allies near ${unit.type} (not implemented)`);
  },

  Percy: () => {
    console.log(`🔁 [Percy] FSM handles repeat logic on kill. No direct action.`);
  },

  Flee: () => {
    console.log(`🏃 [Flee] FSM handles move-after-attack. No direct action.`);
  },

  Recover: (unit) => {
    console.log(`🌀 [Recover] Unit regains 1 action`);
    unit.actions = 1;
  },

  Explode: () => {
    console.log(`💣 [Explode] Not implemented`);
  },

  Seize: () => {
    console.log(`🏛️ [Seize] Capture not implemented`);
  },

  Corrupt: () => {
    console.log(`☣️ [Corrupt] Status effect is already handled in attack logic`);
  },

  Invade: () => {
    console.log(`🛸 [Invade] Not implemented`);
  }
};

function runActingAction(unit, target = null) {
  if (!unit.modules || unit.modules.length === 0) {
    evaluatePostAction(unit, { type: 'acting' });
    return;
  }

  console.log(`⚙️ [UNIT_ACTING] Running acting modules for ${unit.type}`);
  let grantedExtraAction = false;

  for (const mod of unit.modules) {
    const action = ActingActions[mod];
    if (typeof action === 'function') {
      console.log(`▶️ Executing: ${mod}`);
      const before = unit.actions;
      action(unit, target);

      if (unit.actions > before) {
        grantedExtraAction = true;
      }
    }
  }

  if (!grantedExtraAction) {
    console.log('⏹️ No extra actions — ending acting phase');
    evaluatePostAction(unit, { type: 'acting' });
  } else {
    console.log('🔁 Extra action granted — FSM will wait for next move');
  }
}

export { runActingAction };
