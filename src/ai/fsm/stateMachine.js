export class StateMachine {
    constructor(initialState, transitions) {
        this.currentState = initialState;
        this.transitions = transitions;
    }

    // Изменение состояния
    changeState(newState) {
        // Проверка возможности перехода
        const allowedTransition = this.transitions.find(
            t => t.from === this.currentState && t.to === newState
        );

        if (allowedTransition) {
            this.currentState = newState;
            return true;
        }

        return false;
    }

    // Выполнение действий текущего состояния
    executeCurrentState(gameState) {
        // Здесь будет логика выполнения действий для каждого состояния
        switch(this.currentState) {
            case 'attack':
                return this.executeAttackStrategy(gameState);
            case 'defend':
                return this.executeDefendStrategy(gameState);
            case 'expand':
                return this.executeExpandStrategy(gameState);
            case 'economy':
                return this.executeEconomyStrategy(gameState);
            default:
                return [];
        }
    }

    // Методы выполнения стратегий
    executeAttackStrategy(gameState) {
        return gameState.units
            .filter(u => u.canAttack)
            .map(unit => ({
                type: 'attack',
                unit: unit,
                target: this.findBestAttackTarget(unit, gameState)
            }));
    }

    executeDefendStrategy(gameState) {
        return gameState.units
            .map(unit => ({
                type: 'defend',
                unit: unit,
                position: this.findBestDefensivePosition(unit, gameState)
            }));
    }

    executeExpandStrategy(gameState) {
        return gameState.units
            .filter(u => u.canCapture)
            .map(unit => ({
                type: 'expand',
                unit: unit,
                target: this.findBestExpansionTarget(unit, gameState)
            }));
    }

    executeEconomyStrategy(gameState) {
        return gameState.cities
            .map(city => ({
                type: 'build',
                city: city,
                unit: this.selectBestUnitToBuild(city, gameState)
            }));
    }

    // Вспомогательные методы поиска целей
    findBestAttackTarget(unit, gameState) {
        const enemyUnits = gameState.units.filter(u => u.owner !== unit.owner);
        return enemyUnits.length > 0 ? enemyUnits[0] : null;
    }

    findBestDefensivePosition(unit, gameState) {
        return { q: unit.q, r: unit.r, s: unit.s };
    }

    findBestExpansionTarget(unit, gameState) {
        return { q: unit.q + 1, r: unit.r, s: unit.s };
    }

    selectBestUnitToBuild(city, gameState) {
        const units = ['settler', 'warrior', 'archer'];
        return units[Math.floor(Math.random() * units.length)];
    }
}