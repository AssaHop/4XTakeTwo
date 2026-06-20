// src/ai/fsm/strategyFSM.js
import { AttackState } from './states/attackState.js';

export class StrategyFSM {
  constructor(gameState, owner) {
    this.gameState    = gameState;
    this.owner        = owner;
    this.currentState = 'attack'; // стартовое состояние
  }

  update() {
    // Здесь потом добавим переходы между состояниями
    return this.executeCurrentState();
  }

  executeCurrentState() {
    switch (this.currentState) {
      case 'attack':
        return new AttackState(this.gameState, this.owner).execute();
      // defend, expand, economy — позже
      default:
        return [];
    }
  }
}
