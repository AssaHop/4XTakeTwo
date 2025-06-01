export class IdleState {
    constructor(gameState) {
        this.gameState = gameState;
    }

    // Основная логика состояния покоя
    execute() {
        // Минимальные действия в состоянии покоя
        return this.gameState.units.map(unit => ({
            type: 'idle',
            unit: unit,
            action: 'waiting',
            description: 'No immediate actions required'
        }));
    }

    // Проверка условий для выхода из состояния покоя
    shouldTransition() {
        // Например, переход при появлении врагов или возможности захвата
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );
        
        const capturableUnits = this.gameState.units.filter(
            u => u.owner === this.gameState.currentPlayer && u.canCapture
        );

        return {
            toAttack: enemyUnits.length > 0,
            toExpand: capturableUnits.length > 0
        };
    }

    // Logging состояния
    getStateInfo() {
        return {
            name: 'IDLE',
            description: 'AI is in a passive state, waiting for opportunities',
            unitCount: this.gameState.units.length
        };
    }
}