// ✅ gameStateMachine.js (надежное управление подсветкой — аккуратно, без отключения нужного)

import { state } from './state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { highlightUnitContext, clearMoveHighlights, clearAttackHighlights, clearAllHighlights } from '../ui/highlightManager.js';

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
  console.log(`[DEBUG] handlePostMovePhase — Unit=${unit.type}, Actions=${unit.actions}, moveUsed=${unit.moveUsed}`);

  // 💡 Надежно: очищаем move подсветку, но перерисуем всё через highlightUnitContext ниже
  clearMoveHighlights();
  clearAttackHighlights();

  if (unit.actions > 0) {
    transitionTo(GameState.UNIT_SELECTED);
    highlightUnitContext(unit); // ✅ подсветка будет пересчитана и возвращена, если юнит ещё активен
    return;
  }

  unit.actions = 0;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
  clearAllHighlights();
}

function handlePostActingPhase(unit) {
  // ⚡ Поддержка Flee — разрешаем движение после acting
  if (unit.canMoveAfterAttack && !unit.moveUsed) {
    console.log(`💨 [Flee Module] Move allowed after acting`);
    unit.actions = 1;
    highlightUnitContext(unit); // ✅ здесь тоже будет полное обновление подсветки
    transitionTo(GameState.UNIT_SELECTED);
    return;
  }

  unit.actions = 0;
  unit.chargeBonusGiven = false;
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
  handlePostMovePhase,
  handlePostActingPhase
};
