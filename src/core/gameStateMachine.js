// 📂 src/core/gameStateMachine.js

import { state } from './state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { runActingAction } from './unitActingActions.js';
import { highlightUnitContext } from '../ui/highlightManager.js';
import { highlightHexes } from '../ui/render.js';
const GameState = {
  IDLE: 'IDLE',
  UNIT_SELECTED: 'UNIT_SELECTED',
  UNIT_MOVING: 'UNIT_MOVING',
  UNIT_ACTING: 'UNIT_ACTING',
  ENEMY_TURN: 'ENEMY_TURN',
  GAME_OVER: 'GAME_OVER'
};

let currentState = GameState.IDLE;

function getState() {
  return currentState;
}

function transitionTo(newState) {
  console.log(`🎯 GameState Transition: ${currentState} ➝ ${newState}`);
  currentState = newState;
}

function is(stateValue) {
  return currentState === stateValue;
}

function handlePostMovePhase(unit) {
  const hasCharge = unit.hasModule('Charge');
  const hasPending = unit.pendingChargeAttack;

  console.log(`[DEBUG] handlePostMovePhase — Unit=${unit.type}, Actions=${unit.actions}, Charge=${hasCharge}, Pending=${hasPending}`);

  if (hasCharge && hasPending) {
    console.log(`⚡ [ChargeTrigger] Launching UNIT_ACTING`);
    unit.pendingChargeAttack = false;
    transitionTo(GameState.UNIT_ACTING);
    runActingAction(unit);
    return;
  }

  // 💡 Всегда обновлять контекст после move
  if (unit.actions > 0) {
    highlightUnitContext(unit);
    transitionTo(GameState.UNIT_SELECTED);
    return;
  }

  console.log(`⚠️ [PostMovePhase] No actions left — switching to IDLE`);
  unit.actions = 0;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
}







function handlePostActingPhase(unit) {
  unit.actions = 0;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
}

export {
  GameState,
  getState,
  transitionTo,
  is,
  handlePostMovePhase,
  handlePostActingPhase
};
