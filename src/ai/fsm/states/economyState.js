export class EconomyState {
    constructor(gameState) {
        this.gameState = gameState;
        this.resourcePriorities = {
            PRODUCTION: 'unit_creation',
            INFRASTRUCTURE: 'building_upgrade',
            RESEARCH: 'technology_development'
        };
    }

    // Выполнение экономических действий
    execute() {
        // Юниты, способные производить ресурсы
        const economyUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canProduce
        );

        return economyUnits.map(unit => {
            const resourceAction = this.determineBestResourceAction(unit);
            return {
                type: 'economy',
                unit: unit,
                action: resourceAction,
                strategy: this.determineEconomicStrategy(resourceAction)
            };
        });
    }

    // Определение лучшего действия с ресурсами
    determineBestResourceAction(unit) {
        const currentResources = this.gameState.resources;
        const resourceNeeds = this.calculateResourceNeeds();

        if (currentResources.gold < resourceNeeds.unitProduction) {
            return this.resourcePriorities.PRODUCTION;
        }

        if (currentResources.technology < resourceNeeds.researchRate) {
            return this.resourcePriorities.RESEARCH;
        }

        return this.resourcePriorities.INFRASTRUCTURE;
    }

    // Расчет потребностей в ресурсах
    calculateResourceNeeds() {
        const ownUnits = this.gameState.units.filter(
            u => u.owner === this.gameState.currentPlayer
        );

        return {
            unitProduction: ownUnits.length * 10,
            researchRate: ownUnits.length * 5,
            infrastructureCost: ownUnits.length * 15
        };
    }

    // Определение экономической стратегии
    determineEconomicStrategy(resourceAction) {
        switch(resourceAction) {
            case this.resourcePriorities.PRODUCTION:
                return 'aggressive_expansion';
            case this.resourcePriorities.RESEARCH:
                return 'technological_focus';
            case this.resourcePriorities.INFRASTRUCTURE:
                return 'sustainable_growth';
            default:
                return 'balanced';
        }
    }

    // Проверка условий перехода из экономического состояния
    shouldTransition() {
        const enemyUnits = this.gameState.units.filter(
            u => u.owner !== this.gameState.currentPlayer
        );

        const currentResources = this.gameState.resources;

        return {
            toAttack: enemyUnits.length > 0 && currentResources.gold > 100,
            toDefend: enemyUnits.length > this.gameState.units.length * 0.5,
            toExpand: currentResources.gold > 200
        };
    }

    // Получение информации о состоянии
    getStateInfo() {
        const economyUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canProduce
        );

        return {
            name: 'ECONOMY',
            description: 'AI is focusing on resource management and development',
            economyUnitsCount: economyUnits.length,
            resources: this.gameState.resources,
            resourcePriority: this.determinePrimaryResourcePriority()
        };
    }

    // Определение приоритетного ресурса
    determinePrimaryResourcePriority() {
        const resources = this.gameState.resources;
        const priorities = [
            { type: 'gold', value: resources.gold },
            { type: 'technology', value: resources.technology },
            { type: 'production', value: resources.production }
        ];

        return priorities.sort((a, b) => b.value - a.value)[0].type;
    }

    // Расчет эффективности экономики
    calculateEconomyEfficiency() {
        const resources = this.gameState.resources;
        const economyUnits = this.gameState.units.filter(
            unit => unit.owner === this.gameState.currentPlayer && unit.canProduce
        );

        return {
            totalResourceGeneration: {
                gold: resources.gold,
                technology: resources.technology,
                production: resources.production
            },
            unitProductivity: economyUnits.length
        };
    }
}