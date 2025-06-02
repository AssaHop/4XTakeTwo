import { AttackState } from './states/attackState.js';
// При необходимости позже добавим:
// import { DefendState } from '../states/defendState.js';
// import { ExpandState } from '../states/expandState.js';
// import { EconomyState } from '../states/economyState.js';

export class StateMachine {
  constructor(initialState, transitions) {
    this.currentState = initialState;
    this.transitions = transitions;
  }

  update(gameState) {
    for (const transition of this.transitions) {
      if (transition.from === this.currentState &&
          transition.condition(gameState)) {
        console.log(`🔁 FSM переход: ${this.currentState} → ${transition.to}`);
        this.currentState = transition.to;
        break;
      }
    }
  }

  executeCurrentState(gameState) {
    switch (this.currentState) {
      case 'attack':
        return new AttackState(gameState).execute();

      case 'defend':
        // TODO: return new DefendState(gameState).execute();
        return [];

      case 'expand':
        // TODO: return new ExpandState(gameState).execute();
        return [];

      case 'economy':
        // TODO: return new EconomyState(gameState).execute();
        return [];

      default:
        return [];
    }
  }
}
