// Capture Actions Module

export class CaptureActions {
    constructor(context) {
        this.context = context;
        this.captureStrategies = {
            'territory': this.territoryCaptureAction,
            'resource': this.resourceCaptureAction,
            'target': this.targetCaptureAction,
            'strategic': this.strategicCaptureAction
        };
    }

    // Захват территории
    territoryCaptureAction(territory, captureMethod = 'standard') {
        if (!territory) {
            throw new Error('No territory specified for capture');
        }

        const captureParams = {
            type: 'territory',
            target: territory,
            method: captureMethod,
            timestamp: new Date(),
            successProbability: this.calculateTerritoryCaptureSuccess(territory, captureMethod)
        };

        this.logCaptureAction(captureParams);
        return captureParams;
    }

    // Захват ресурсов
    resourceCaptureAction(resource, quantity, extractionMethod = 'standard') {
        if (!resource || quantity <= 0) {
            throw new Error('Invalid resource capture parameters');
        }

        const captureParams = {
            type: 'resource',
            resource: resource,
            quantity: quantity,
            method: extractionMethod,
            timestamp: new Date(),
            efficiency: this.calculateResourceCaptureEfficiency(resource, quantity, extractionMethod)
        };

        this.logCaptureAction(captureParams);
        return captureParams;
    }

    // Захват конкретной цели
    targetCaptureAction(target, captureType = 'neutralize') {
        if (!target) {
            throw new Error('No target specified for capture');
        }

        const captureParams = {
            type: 'target',
            target: target,
            captureType: captureType,
            timestamp: new Date(),
            completionRisk: this.calculateTargetCaptureCost(target, captureType)
        };

        this.logCaptureAction(captureParams);
        return captureParams;
    }

    // Стратегический захват
    strategicCaptureAction(objectives, strategicPriority = 'high') {
        if (!objectives || objectives.length === 0) {
            throw new Error('No strategic objectives specified');
        }

        const captureParams = {
            type: 'strategic',
            objectives: objectives,
            priority: strategicPriority,
            timestamp: new Date(),
            strategicValue: this.calculateStrategicCaptureValue(objectives, strategicPriority)
        };

        this.logCaptureAction(captureParams);
        return captureParams;
    }

    // Расчет вероятности захвата территории
    calculateTerritoryCaptureSuccess(territory, method) {
        const baseSuccessProbability = 0.6;
        const methodModifiers = {
            'standard': 1.0,
            'stealth': 1.2,
            'forceful': 0.8
        };

        const methodModifier = methodModifiers[method] || 1.0;
        return Math.min(baseSuccessProbability * methodModifier, 1.0);
    }

    // Расчет эффективности захвата ресурсов
    calculateResourceCaptureEfficiency(resource, quantity, method) {
        const baseEfficiency = 0.7;
        const methodModifiers = {
            'standard': 1.0,
            'precise': 1.2,
            'bulk': 0.9
        };

        const methodModifier = methodModifiers[method] || 1.0;
        return Math.min(baseEfficiency * methodModifier * (quantity / 100), 1.0);
    }

    // Расчет риска/стоимости захвата цели
    calculateTargetCaptureCost(target, captureType) {
        const baseCost = 0.5;
        const typeModifiers = {
            'neutralize': 1.0,
            'capture': 1.2,
            'eliminate': 0.8
        };

        const typeModifier = typeModifiers[captureType] || 1.0;
        return Math.min(baseCost * typeModifier, 1.0);
    }

    // Расчет стратегической ценности захвата
    calculateStrategicCaptureValue(objectives, priority) {
        const basePriorityModifiers = {
            'low': 0.6,
            'medium': 0.8,
            'high': 1.2
        };

        const priorityModifier = basePriorityModifiers[priority] || 1.0;
        const objectiveDiversity = 1 - (1 / (objectives.length + 1));

        return Math.min(0.7 * priorityModifier * objectiveDiversity, 1.0);
    }

    // Выполнение захвата с выбранной стратегией
    executeCaptureAction(strategy, target, params = {}) {
        if (!this.captureStrategies[strategy]) {
            throw new Error(`Unknown capture strategy: ${strategy}`);
        }

        return this.captureStrategies[strategy].call(this, target, params.method);
    }

    // Логирование действий по захвату
    logCaptureAction(captureData) {
        console.log(`Capture Action Log: ${JSON.stringify(captureData)}`);
        
        if (this.context && this.context.updateCaptureStats) {
            this.context.updateCaptureStats(captureData);
        }
    }

    // Анализ эффективности захватов
    analyzeCaptureEffectiveness(captureHistory) {
        if (!captureHistory || captureHistory.length === 0) {
            return {
                totalCaptures: 0,
                strategyEffectiveness: {}
            };
        }

        const totalCaptures = captureHistory.length;
        
        const strategyEffectiveness = captureHistory.reduce((stats, capture) => {
            stats[capture.type] = stats[capture.type] || { 
                total: 0, 
                averageEfficiency: 0,
                metrics: []
            };
            stats[capture.type].total++;
            
            // Добавление специфических метрик для каждого типа захвата
            switch(capture.type) {
                case 'territory':
                    stats[capture.type].metrics.push(capture.successProbability);
                    break;
                case 'resource':
                    stats[capture.type].metrics.push(capture.efficiency);
                    break;
                case 'target':
                    stats[capture.type].metrics.push(1 - capture.completionRisk);
                    break;
                case 'strategic':
                    stats[capture.type].metrics.push(capture.strategicValue);
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
            totalCaptures,
            strategyEffectiveness
        };
    }
}