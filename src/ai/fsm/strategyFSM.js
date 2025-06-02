    // src/ai/fsm/strategyFSM.js
    import { StateMachine } from './stateMachine.js';
    import { getTransitions } from './transitions.js';

    export class StrategyFSM {
    constructor(gameState) {
        this.gameState = gameState;

        const initialState = this.getInitialState(gameState);
        const transitions = getTransitions();

        this.stateMachine = new StateMachine(initialState, transitions);
    }

    update() {
        this.stateMachine.update(this.gameState);
        return this.stateMachine.executeCurrentState(this.gameState);
    }

    getCurrentStrategy() {
        return this.stateMachine.currentState;
    }

    getInitialState(gameState) {
        const state = 'attack';
        console.log(`🧭 [FSM] Стартовое стратегическое состояние принудительно установлено в: ${state}`);
        return state;
    }
    }
