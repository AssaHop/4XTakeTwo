import { state } from './state.js';
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
  // Percy/Flee уже применены в combatLogic.js:performAttack (единственное
  // место, где решается КОГДА они срабатывают — actBonusUsed-гейт живёт
  // только там). Здесь просто реагируем UI-переходом на уже готовый
  // результат, не пересчитывая условия срабатывания второй раз.
  if (type === 'attack') {
    if (unit.canAct) {
      console.log('🔁 [Percy] Repeat attack available — UI update');
      transitionTo(GameState.UNIT_SELECTED);
      highlightOnlyAttacks(unit);
      return;
    }

    if (unit.canMove) {
      console.log('🏃 [Flee] Move after attack available — UI update');
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
