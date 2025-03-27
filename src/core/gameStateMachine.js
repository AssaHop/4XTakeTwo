// 📂 core/gameStateMachine.js

import { state } from './state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import {
  highlightUnitContext,
  highlightOnlyAttacks,
  clearMoveHighlights,
  clearAttackHighlights,
  clearAllHighlights
} from '../ui/highlightManager.js';

// 🎮 FSM States
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

// 🧠 Универсальный обработчик пост-действия
function evaluatePostAction(unit, { type, killed = false }) {
  console.log(`🧠 [PostEval] ${type} — Killed: ${killed} | Flags:`, unit);

  // ————— ATTACK LOGIC —————
  if (type === 'attack') {
    unit.hasActed = true;

    // Percy: Повторная атака после убийства
    if (killed && unit.canRepeatAttackOnKill) {
      console.log('🔁 [Percy Triggered] Repeat attack granted');
      unit.actions = 1;
      unit.moveUsed = true;
      unit.chargeBonusGiven = false;
      unit.fleeBonusGiven = false;
      transitionTo(GameState.UNIT_SELECTED);
      highlightOnlyAttacks(unit);
      return;
    }

    // Flee: Можно двигаться после атаки
    if (
      unit.canMoveAfterAttack &&
      unit.hasActed &&
      !unit.moveUsed &&
      !unit.fleeBonusGiven
    ) {
      console.log('🏃 [Flee Triggered] Move after attack allowed');
      unit.actions = 1;
      unit.fleeBonusGiven = true;
      transitionTo(GameState.UNIT_SELECTED);
      highlightUnitContext(unit);
      return;
    }
  }

  // ————— MOVE LOGIC —————
  if (type === 'move') {
    clearMoveHighlights();
    clearAttackHighlights();

    if (unit.actions > 0 && unit.canAttackAfterMove) {
      console.log('⚔️ [Charge Ready] Attack after move allowed');
      transitionTo(GameState.UNIT_SELECTED);
      highlightUnitContext(unit);
      return;
    }
  }

  // ————— DEFAULT / CLEANUP —————
  console.log('🛑 [PostAction] Ending unit phase');
  unit.actions = 0;
  unit.hasActed = false;
  unit.chargeBonusGiven = false;
  unit.fleeBonusGiven = false;
  unit.deselect?.();
  state.selectedUnit = null;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
  clearAllHighlights();
}

export {
  GameState,
  getState,
  transitionTo,
  is,
  evaluatePostAction,
};
