import { StateMachine } from './stateMachine';
import { getTransitions } from './transitions';

export class StrategyFSM {
    constructor(gameState) {
        this.gameState = gameState;
        this.stateMachine = new StateMachine(
            this.getCurrentState(), 
            getTransitions()
        );
    }

    // Определение текущего стратегического состояния
    getCurrentState() {
        const states = {
            ATTACK: 'attack',
            DEFEND: 'defend', 
            EXPAND: 'expand',
            ECONOMY: 'economy'
        };

        // Простая логика определения состояния
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );
        const playerUnits = this.gameState.units.filter(
            u => u.owner === this.gameState.currentPlayer
        );

        if (enemyUnits.length > playerUnits.length * 1.5) {
            return states.DEFEND;
        }

        if (playerUnits.some(u => u.canCapture)) {
            return states.EXPAND;
        }

        if (enemyUnits.length > 0) {
            return states.ATTACK;
        }

        return states.ECONOMY;
    }

    // Обновление стратегии
    update() {
        const newState = this.getCurrentState();
        this.stateMachine.changeState(newState);
        
        // Выполнение действий текущего состояния
        return this.stateMachine.executeCurrentState(this.gameState);
    }

    // Получение текущего состояния
    getCurrentStrategy() {
        return this.stateMachine.currentState;
    }
}