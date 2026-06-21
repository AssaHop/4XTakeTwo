// src/ai/fsm/strategyFSM.js
import { AttackState } from './states/attackState.js';

export class StrategyFSM {
  constructor(gameState, owner) {
    this.gameState    = gameState;
    this.owner        = owner;
    this.currentState = 'attack'; // стартовое состояние
  }

  update(executeCallback) {
    // Здесь потом добавим переходы между состояниями
    return this.executeCurrentState(executeCallback);
  }

  executeCurrentState(executeCallback) {
    switch (this.currentState) {
      case 'attack':
        return new AttackState(this.gameState, this.owner).execute(executeCallback);
      // defend, expand, economy — позже
      default:
        return Promise.resolve([]);
    }
  }
}
