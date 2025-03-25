// ✅ gameStateMachine.js (исправлен синтаксис log + FSM Percy/Flee поддержка)

import { state } from './state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import {
  highlightUnitContext,
  clearMoveHighlights,
  clearAttackHighlights,
  clearAllHighlights
} from '../ui/highlightManager.js';

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
  clearMoveHighlights();
  clearAttackHighlights();

  if (unit.actions > 0) {
    transitionTo(GameState.UNIT_SELECTED);
    highlightUnitContext(unit);
    return;
  }

  unit.actions = 0;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
  clearAllHighlights();
}

function handlePostActingPhase(unit) {
  if (unit.canMoveAfterAttack) {
    if (!unit.moveUsed) {
      console.log(`💨 [Flee Module] Move allowed after acting`);
      unit.actions = 1;
      highlightUnitContext(unit);
      transitionTo(GameState.UNIT_SELECTED);
      return;
    } else {
      console.log(`⛔ [Flee Blocked] moveUsed=true — повторное движение запрещено`);
    }
  } else {
    console.log(`❌ [Flee Skipped] Unit has no Flee capability`);
  }

  unit.actions = 0;
  unit.chargeBonusGiven = false;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
  clearAllHighlights();
}

function handlePostAttackPhase(unit, killed = false) {
  console.log(`[FSM] handlePostAttackPhase → killed=${killed}, canRepeatAttackOnKill=${unit.canRepeatAttackOnKill}`);

  // ⛔ Предотвращение некорректной переактивации
  if (unit.actions <= 0) {
    console.log('🚫 [Guard] Unit has no actions after attack – deselecting');
    unit.deselect?.();
    state.selectedUnit = null;
    clearAllHighlights();
    updateEndTurnButton();
    transitionTo(GameState.IDLE);
    return;
  }

  // 🔁 Повторная атака на убийство (Percy)
  if (killed && unit.canRepeatAttackOnKill) {
    unit.actions = 1;
    console.log('🔁 [Percy Triggered] Unit can attack again');
    highlightUnitContext(unit);
    transitionTo(GameState.UNIT_SELECTED);
    return;
  }

  // 🏃 Возможность убежать после атаки (Flee)
  if (unit.canMoveAfterAttack && !unit.moveUsed) {
    unit.actions = 1;
    console.log('🏃 [Flee Triggered] Move after attack allowed');
    highlightUnitContext(unit);
    transitionTo(GameState.UNIT_SELECTED);
    return;
  }

  // ✅ Иначе — конец активации
  unit.actions = 0;
  unit.chargeBonusGiven = false;
  unit.deselect?.();
  state.selectedUnit = null;
  state.hasActedThisTurn = true;
  clearAllHighlights();
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
}


export {
  GameState,
  getState,
  transitionTo,
  is,
  handlePostMovePhase,
  handlePostActingPhase,
  handlePostAttackPhase,
};
