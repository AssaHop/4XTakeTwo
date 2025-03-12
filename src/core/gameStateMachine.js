// 📂 core/gameStateMachine.js

const GameState = {
    IDLE: 'IDLE',
    UNIT_SELECTED: 'UNIT_SELECTED',
    UNIT_MOVING: 'UNIT_MOVING',
    UNIT_ATTACKING: 'UNIT_ATTACKING',
    ENEMY_TURN: 'ENEMY_TURN',
    GAME_OVER: 'GAME_OVER',
  };
  
  let currentState = GameState.IDLE;
  
  function getState() {
    return currentState;
  }
  
  function transitionTo(newState) {
    console.log(`🎯 GameState Transition: ${currentState} ➝ ${newState}`);
    currentState = newState;
  }
  
  function is(state) {
    return currentState === state;
  }
  
  export { GameState, getState, transitionTo, is };