export class ExpandState {
    constructor(gameState) {
        this.gameState = gameState;
    }

    // Выполнение действий по расширению 
    execute() {
        // Юниты, способные захватывать территории
        const capturerUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canCapture
        );

        return capturerUnits.map(unit => {
            const expansionTarget = this.findBestExpansionTarget(unit);
            return {
                type: 'expand',
                unit: unit,
                target: expansionTarget,
                strategy: this.determineExpansionStrategy(unit, expansionTarget)
            };
        });
    }

    // Поиск лучшей территории для захвата
    findBestExpansionTarget(unit) {
        const uncapturedTiles = this.gameState.tiles.filter(
            tile => tile.owner !== this.gameState.currentPlayer
        );

        // Выбираем ближайшую непринадлежащую территорию
        return uncapturedTiles.reduce((closest, tile) => {
            const currentDistance = this.calculateDistance(unit, tile);
            const closestDistance = this.calculateDistance(unit, closest);
            return currentDistance < closestDistance ? tile : closest;
        });
    }

    // Определение стратегии расширения
    determineExpansionStrategy(unit, target) {
        const distanceToTarget = this.calculateDistance(unit, target);
        
        if (distanceToTarget < 2) return 'aggressive_capture';
        if (distanceToTarget < 5) return 'cautious_approach';
        
        return 'strategic_positioning';
    }

    // Расчет дистанции 
    calculateDistance(unit, target) {
        return Math.sqrt(
            Math.pow(unit.q - target.q, 2) + 
            Math.pow(unit.r - target.r, 2) + 
            Math.pow(unit.s - target.s, 2)
        );
    }

    // Проверка условий перехода из состояния расширения
    shouldTransition() {
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );

        const uncapturedTiles = this.gameState.tiles.filter(
            tile => tile.owner !== this.gameState.currentPlayer
        );

        return {
            toDefend: enemyUnits.length > this.gameState.units.length * 1.5,
            toAttack: enemyUnits.length > 0,
            toEconomy: uncapturedTiles.length === 0
        };
    }

    // Получение информации о состоянии
    getStateInfo() {
        const capturerUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canCapture
        );

        const uncapturedTiles = this.gameState.tiles.filter(
            tile => tile.owner !== this.gameState.currentPlayer
        );

        return {
            name: 'EXPAND',
            description: 'AI is focusing on territorial expansion',
            capturerUnitsCount: capturerUnits.length,
            uncapturedTilesCount: uncapturedTiles.length
        };
    }
}