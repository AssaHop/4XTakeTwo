export class AttackState {
    constructor(gameState) {
        this.gameState = gameState;
        this.attackPriorities = {
            weakestEnemy: 'lowest_health',
            nearestEnemy: 'closest_distance',
            strategicTarget: 'most_valuable'
        };
    }

    // Выполнение атакующих действий
    execute() {
        // Фильтруем боевые юниты, способные атаковать
        const attackUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canAttack
        );

        return attackUnits.map(unit => {
            const target = this.findBestTarget(unit);
            return {
                type: 'attack',
                unit: unit,
                target: target,
                strategy: this.determineAttackStrategy(unit, target)
            };
        });
    }

    // Поиск лучшей цели для атаки
    findBestTarget(attackingUnit) {
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );

        // Простейшая логика - атака ближайшего врага
        return enemyUnits.reduce((closest, enemy) => {
            const currentDistance = this.calculateDistance(attackingUnit, enemy);
            const closestDistance = this.calculateDistance(attackingUnit, closest);
            return currentDistance < closestDistance ? enemy : closest;
        });
    }

    // Определение стратегии атаки
    determineAttackStrategy(attacker, target) {
        const healthRatio = target.health / target.maxHealth;
        
        if (healthRatio < 0.3) return 'finish_off';
        if (attacker.health > target.health * 1.5) return 'aggressive';
        
        return 'cautious';
    }

    // Вспомогательный метод расчета дистанции
    calculateDistance(unit1, unit2) {
        return Math.sqrt(
            Math.pow(unit1.q - unit2.q, 2) + 
            Math.pow(unit1.r - unit2.r, 2) + 
            Math.pow(unit1.s - unit2.s, 2)
        );
    }

    // Проверка условий перехода из состояния атаки
    shouldTransition() {
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );

        return {
            toDefend: enemyUnits.length > this.gameState.units.length * 1.5,
            toExpand: enemyUnits.length === 0,
            toEconomy: enemyUnits.length === 0
        };
    }

    // Получение информации о состоянии
    getStateInfo() {
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );

        return {
            name: 'ATTACK',
            description: 'AI is in an aggressive state, targeting enemies',
            enemyCount: enemyUnits.length,
            attackPotential: this.calculateAttackPotential()
        };
    }

    // Расчет потенциала атаки
    calculateAttackPotential() {
        const attackUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canAttack
        );

        return {
            totalAttackUnits: attackUnits.length,
            averageUnitStrength: attackUnits.reduce((sum, unit) => sum + unit.strength, 0) / attackUnits.length
        };
    }
}