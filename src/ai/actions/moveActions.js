// Move Actions Module

export class MoveActions {
    constructor(context) {
        this.context = context;
        this.movementStrategies = {
            'standard': this.standardMove,
            'stealth': this.stealthMove,
            'fast': this.fastMove,
            'patrol': this.patrolMove
        };
    }

    // Стандартное перемещение
    standardMove(destination, speed = 1.0) {
        if (!destination) {
            throw new Error('No destination specified for movement');
        }

        const moveParams = {
            type: 'standard',
            destination: destination,
            speed: speed,
            timestamp: new Date(),
            efficiency: this.calculateMoveEfficiency(speed)
        };

        this.logMovement(moveParams);
        return moveParams;
    }

    // Скрытное перемещение
    stealthMove(destination, stealthFactor = 0.8) {
        if (!destination) {
            throw new Error('No destination specified for stealth movement');
        }

        const moveParams = {
            type: 'stealth',
            destination: destination,
            stealthFactor: stealthFactor,
            timestamp: new Date(),
            detectability: this.calculateStealthDetectability(stealthFactor)
        };

        this.logMovement(moveParams);
        return moveParams;
    }

    // Быстрое перемещение
    fastMove(destination, urgency = 1.0) {
        if (!destination) {
            throw new Error('No destination specified for fast movement');
        }

        const moveParams = {
            type: 'fast',
            destination: destination,
            urgency: urgency,
            timestamp: new Date(),
            energyCost: this.calculateFastMoveEnergyCost(urgency)
        };

        this.logMovement(moveParams);
        return moveParams;
    }

    // Патрулирование
    patrolMove(waypoints, patrolPattern = 'circular') {
        if (!waypoints || waypoints.length === 0) {
            throw new Error('No waypoints specified for patrol movement');
        }

        const moveParams = {
            type: 'patrol',
            waypoints: waypoints,
            pattern: patrolPattern,
            timestamp: new Date(),
            coverage: this.calculatePatrolCoverage(waypoints, patrolPattern)
        };

        this.logMovement(moveParams);
        return moveParams;
    }

    // Расчет эффективности стандартного перемещения
    calculateMoveEfficiency(speed) {
        const baseEfficiency = 0.7;
        return Math.min(baseEfficiency * speed, 1.0);
    }

    // Расчет вероятности обнаружения при скрытном перемещении
    calculateStealthDetectability(stealthFactor) {
        const baseDetectability = 0.3;
        return Math.max(baseDetectability * (1 - stealthFactor), 0.01);
    }

    // Расчет энергозатрат при быстром перемещении
    calculateFastMoveEnergyCost(urgency) {
        const baseEnergyCost = 0.5;
        return Math.min(baseEnergyCost * urgency, 1.0);
    }

    // Расчет площади покрытия при патрулировании
    calculatePatrolCoverage(waypoints, pattern) {
        const baseConverage = 0.6;
        const patternMultipliers = {
            'circular': 1.0,
            'linear': 0.7,
            'random': 0.8
        };

        const patternMultiplier = patternMultipliers[pattern] || 0.6;
        return Math.min(baseConverage * patternMultiplier * waypoints.length, 1.0);
    }

    // Выполнение перемещения с выбранной стратегией
    executeMove(strategy, destination, params = {}) {
        if (!this.movementStrategies[strategy]) {
            throw new Error(`Unknown movement strategy: ${strategy}`);
        }

        return this.movementStrategies[strategy].call(this, destination, params.speed);
    }

    // Логирование перемещения
    logMovement(movementData) {
        console.log(`Movement Log: ${JSON.stringify(movementData)}`);
        
        if (this.context && this.context.updateMovementStats) {
            this.context.updateMovementStats(movementData);
        }
    }

    // Анализ эффективности перемещений
    analyzeMoveEffectiveness(movementHistory) {
        if (!movementHistory || movementHistory.length === 0) {
            return {
                totalMoves: 0,
                strategyEffectiveness: {}
            };
        }

        const totalMoves = movementHistory.length;
        
        const strategyEffectiveness = movementHistory.reduce((stats, move) => {
            stats[move.type] = stats[move.type] || { 
                total: 0, 
                averageEfficiency: 0,
                metrics: []
            };
            stats[move.type].total++;
            
            // Добавление специфических метрик для каждого типа перемещения
            switch(move.type) {
                case 'standard':
                    stats[move.type].metrics.push(move.efficiency);
                    break;
                case 'stealth':
                    stats[move.type].metrics.push(1 - move.detectability);
                    break;
                case 'fast':
                    stats[move.type].metrics.push(1 - move.energyCost);
                    break;
                case 'patrol':
                    stats[move.type].metrics.push(move.coverage);
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
            totalMoves,
            strategyEffectiveness
        };
    }
}