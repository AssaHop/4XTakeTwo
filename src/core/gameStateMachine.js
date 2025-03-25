import { state } from './state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import {
  highlightUnitContext,
  highlightOnlyAttacks,
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
  if (unit.canMoveAfterAttack && !unit.moveUsed) {
    console.log(`💨 [Flee Module] Move allowed after acting`);
    unit.actions = 1;
    unit.fleeBonusGiven = true;
    highlightUnitContext(unit);
    transitionTo(GameState.UNIT_SELECTED);
    return;
  }

  console.log(`⛔ [Acting Complete] No move after action`);
  unit.actions = 0;
  unit.chargeBonusGiven = false;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
  clearAllHighlights();
}

function handlePostAttackPhase(unit, killed = false) {
  console.log(`[FSM] handlePostAttackPhase → killed=${killed}, canRepeatAttackOnKill=${unit.canRepeatAttackOnKill}`);

  if (killed && unit.canRepeatAttackOnKill) {
    unit.actions = 1;
    console.log(`🔁 [Percy Triggered] Unit can attack again — but NOT move`);
    highlightOnlyAttacks();
    transitionTo(GameState.UNIT_SELECTED);
    return;
  }

  if (unit.canMoveAfterAttack && !unit.moveUsed && !unit.fleeBonusGiven) {
    unit.actions = 1;
    unit.fleeBonusGiven = true;
    console.log('🏃 [Flee Triggered] Move after attack allowed');
    highlightUnitContext(unit);
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
  handlePostActingPhase,
  handlePostAttackPhase,
};
