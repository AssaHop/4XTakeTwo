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
    // 🔁 Percy: доп. атака (цепочка)
    if (unit.hasModule?.('Percy') && killed) {
      unit.canAct = true;

      // ❌ Flee отключается после Percy-чейн
      unit.canMove = false;
      unit.actBonusUsed = true;
      unit.moveBonusUsed = true;

      console.log('🔁 [Percy Triggered] Repeat attack granted (chain)');
      transitionTo(GameState.UNIT_SELECTED);
      highlightOnlyAttacks(unit);
      return;
    }

    // 🏃 Flee — движение после атаки
    if (
      unit.hasModule?.('Flee') &&
      !unit.actBonusUsed &&
      type === 'attack'
    ) {
      unit.canMove = true;
      unit.actBonusUsed = true;
      console.log('🏃 [Flee Triggered] Move after attack granted');
      transitionTo(GameState.UNIT_SELECTED);
      highlightUnitContext(unit);
      return;
    }
  }

  // ————— MOVE LOGIC —————
  if (type === 'move') {
    clearMoveHighlights();
    clearAttackHighlights();

    // ⚡ Charge — модуль: атака после движения
    if (
      unit.hasModule?.('Charge') &&
      !unit.moveBonusUsed
    ) {
      unit.canAct = true;
      unit.moveBonusUsed = true;
      console.log('⚡ [Charge Triggered] Attack granted after move');
      transitionTo(GameState.UNIT_SELECTED);
      highlightUnitContext(unit);
      return;
    }
  }

  // ————— DEFAULT / CLEANUP —————
  const unitDone = !unit.canMove && !unit.canAct;

  if (unitDone) {
    console.log('🛑 [PostAction] Ending unit phase');
    unit.deselect?.();
    state.selectedUnit = null;
    state.hasActedThisTurn = true;
    updateEndTurnButton();
    transitionTo(GameState.IDLE);
    clearAllHighlights();
  } else {
    transitionTo(GameState.UNIT_SELECTED);
    highlightUnitContext(unit);
  }
}

export {
  GameState,
  getState,
  transitionTo,
  is,
  evaluatePostAction,
};
