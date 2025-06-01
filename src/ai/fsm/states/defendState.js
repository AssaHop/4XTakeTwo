export class DefendState {
    constructor(gameState) {
        this.gameState = gameState;
    }

    // Выполнение защитных действий
    execute() {
        // Оборонительные юниты
        const defendUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canDefend
        );

        // Вражеские юниты
        const enemyUnits = this.gameState.units.filter(
            unit => unit.owner !== this.gameState.currentPlayer
        );

        return defendUnits.map(unit => {
            const threatTarget = this.findMostDangerousThreat(unit, enemyUnits);
            return {
                type: 'defend',
                unit: unit,
                threat: threatTarget,
                strategy: this.determineDefenseStrategy(unit, threatTarget)
            };
        });
    }

    // Поиск наиболее опасной угрозы
    findMostDangerousThreat(defendingUnit, enemyUnits) {
        return enemyUnits.reduce((mostDangerous, enemy) => {
            const currentThreat = this.calculateThreatLevel(defendingUnit, enemy);
            const mostDangerousThreat = this.calculateThreatLevel(defendingUnit, mostDangerous);
            return currentThreat > mostDangerousThreat ? enemy : mostDangerous;
        });
    }

    // Расчет уровня угрозы
    calculateThreatLevel(defendingUnit, enemyUnit) {
        const distance = this.calculateDistance(defendingUnit, enemyUnit);
        const strengthDifference = enemyUnit.strength - defendingUnit.strength;
        
        return strengthDifference / (distance + 1);
    }

    // Определение стратегии защиты
    determineDefenseStrategy(unit, threat) {
        const healthRatio = unit.health / unit.maxHealth;
        const distanceToThreat = this.calculateDistance(unit, threat);

        if (healthRatio < 0.3) return 'retreat';
        if (distanceToThreat < 3) return 'aggressive_defense';
        
        return 'positional_defense';
    }

    // Расчет дистанции
    calculateDistance(unit1, unit2) {
        return Math.sqrt(
            Math.pow(unit1.q - unit2.q, 2) + 
            Math.pow(unit1.r - unit2.r, 2) + 
            Math.pow(unit1.s - unit2.s, 2)
        );
    }

    // Проверка условий перехода из состояния защиты
    shouldTransition() {
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );

        const ownUnits = this.gameState.units.filter(
            u => u.owner === this.gameState.currentPlayer
        );

        return {
            toAttack: enemyUnits.length < ownUnits.length * 0.5,
            toExpand: enemyUnits.length === 0,
            toEconomy: enemyUnits.length === 0
        };
    }

    // Получение информации о состоянии
    getStateInfo() {
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );

        const defendUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canDefend
        );

        return {
            name: 'DEFEND',
            description: 'AI is in a defensive posture',
            enemyCount: enemyUnits.length,
            defendUnitsCount: defendUnits.length
        };
    }
}