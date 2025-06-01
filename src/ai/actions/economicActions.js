export class EconomicActions {
    constructor(context) {
        this.context = context;
        this.economicStrategies = {
            'trade': this.tradeAction,
            'production': this.productionAction,
            'investment': this.investmentAction,
            'resourceManagement': this.resourceManagementAction
        };
    }

    // Базовое торговое действие
    tradeAction(resource, quantity, tradeType = 'sell') {
        if (!resource || quantity <= 0) {
            throw new Error('Invalid trade parameters');
        }

        const tradeParams = {
            type: 'trade',
            resource: resource,
            quantity: quantity,
            tradeType: tradeType,
            timestamp: new Date(),
            profitability: this.calculateTradeProfitability(resource, quantity, tradeType)
        };

        this.logEconomicAction(tradeParams);
        return tradeParams;
    }

    // Действие по производству
    productionAction(product, productionVolume, efficiency = 1.0) {
        if (!product || productionVolume <= 0) {
            throw new Error('Invalid production parameters');
        }

        const productionParams = {
            type: 'production',
            product: product,
            volume: productionVolume,
            efficiency: efficiency,
            timestamp: new Date(),
            resourceCost: this.calculateProductionResourceCost(product, productionVolume, efficiency)
        };

        this.logEconomicAction(productionParams);
        return productionParams;
    }

    // Инвестиционное действие
    investmentAction(target, amount, riskLevel = 0.5) {
        if (!target || amount <= 0) {
            throw new Error('Invalid investment parameters');
        }

        const investmentParams = {
            type: 'investment',
            target: target,
            amount: amount,
            riskLevel: riskLevel,
            timestamp: new Date(),
            potentialReturn: this.calculateInvestmentReturn(target, amount, riskLevel)
        };

        this.logEconomicAction(investmentParams);
        return investmentParams;
    }

    // Управление ресурсами
    resourceManagementAction(resources, allocationStrategy = 'balanced') {
        if (!resources || resources.length === 0) {
            throw new Error('No resources specified for management');
        }

        const managementParams = {
            type: 'resourceManagement',
            resources: resources,
            strategy: allocationStrategy,
            timestamp: new Date(),
            efficiency: this.calculateResourceAllocationEfficiency(resources, allocationStrategy)
        };

        this.logEconomicAction(managementParams);
        return managementParams;
    }

    // Расчет прибыльности торговли
    calculateTradeProfitability(resource, quantity, tradeType) {
        const baseProfit = 0.6;
        const tradeTypeModifiers = {
            'sell': 1.2,
            'buy': 0.8
        };

        const typeModifier = tradeTypeModifiers[tradeType] || 1.0;
        return Math.min(baseProfit * typeModifier * (quantity / 100), 1.0);
    }

    // Расчет стоимости ресурсов при производстве
    calculateProductionResourceCost(product, volume, efficiency) {
        const baseResourceCost = 0.5;
        return Math.max(baseResourceCost * (1 - efficiency) * (volume / 100), 0.01);
    }

    // Расчет потенциальной доходности инвестиций
    calculateInvestmentReturn(target, amount, riskLevel) {
        const baseReturn = 0.7;
        return Math.min(baseReturn * (1 - riskLevel) * (amount / 1000), 1.0);
    }

    // Расчет эффективности распределения ресурсов
    calculateResourceAllocationEfficiency(resources, strategy) {
        const strategyEfficiencyModifiers = {
            'balanced': 1.0,
            'concentrated': 1.2,
            'diversified': 0.9
        };

        const strategyModifier = strategyEfficiencyModifiers[strategy] || 1.0;
        const resourceDiversity = 1 - (1 / (resources.length + 1));

        return Math.min(0.7 * strategyModifier * resourceDiversity, 1.0);
    }

    // Выполнение экономического действия с выбранной стратегией
    executeEconomicAction(strategy, target, params = {}) {
        if (!this.economicStrategies[strategy]) {
            throw new Error(`Unknown economic strategy: ${strategy}`);
        }

        return this.economicStrategies[strategy].call(this, target, params.quantity, params.tradeType);
    }

    // Логирование экономического действия
    logEconomicAction(economicData) {
        console.log(`Economic Action Log: ${JSON.stringify(economicData)}`);
        
        if (this.context && this.context.updateEconomicStats) {
            this.context.updateEconomicStats(economicData);
        }
    }

    // Анализ эффективности экономических действий
    analyzeEconomicEffectiveness(economicHistory) {
        if (!economicHistory || economicHistory.length === 0) {
            return {
                totalActions: 0,
                strategyEffectiveness: {}
            };
        }

        const totalActions = economicHistory.length;
        
        const strategyEffectiveness = economicHistory.reduce((stats, action) => {
            stats[action.type] = stats[action.type] || { 
                total: 0, 
                averageEfficiency: 0,
                metrics: []
            };
            stats[action.type].total++;
            
            // Добавление специфических метрик для каждого типа действий
            switch(action.type) {
                case 'trade':
                    stats[action.type].metrics.push(action.profitability);
                    break;
                case 'production':
                    stats[action.type].metrics.push(1 - action.resourceCost);
                    break;
                case 'investment':
                    stats[action.type].metrics.push(action.potentialReturn);
                    break;
                case 'resourceManagement':
                    stats[action.type].metrics.push(action.efficiency);
                    break;
            }

            return stats;
        }, {});

        // Расчет средней эффективности для каждой стратегии
        Object.keys(strategyEffectiveness).forEach(strategy => {
            const { metrics } = strategyEffectiveness[strategy];
            strategyEffectiveness[strategy].averageEfficiency = 
                metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
        });

        return {
            totalActions,
            strategyEffectiveness
        };
    }
}