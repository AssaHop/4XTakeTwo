export class AttackActions {
    constructor(context) {
        this.context = context;
        this.attackStrategies = {
            'direct': this.directAttack,
            'ambush': this.ambushAttack,
            'precision': this.precisionAttack
        };
    }

    // Базовая прямая атака
    directAttack(target, intensity = 1.0) {
        if (!target) {
            throw new Error('No target specified for attack');
        }

        const attackParams = {
            type: 'direct',
            target: target,
            intensity: intensity,
            timestamp: new Date(),
            success: this.calculateAttackSuccess(intensity)
        };

        this.logAttack(attackParams);
        return attackParams;
    }

    // Атака из засады
    ambushAttack(target, stealthFactor = 0.7) {
        if (!target) {
            throw new Error('No target specified for ambush');
        }

        const attackParams = {
            type: 'ambush',
            target: target,
            stealthFactor: stealthFactor,
            timestamp: new Date(),
            success: this.calculateAmbushSuccess(stealthFactor)
        };

        this.logAttack(attackParams);
        return attackParams;
    }

    // Высокоточная атака
    precisionAttack(target, precision = 0.9) {
        if (!target) {
            throw new Error('No target specified for precision attack');
        }

        const attackParams = {
            type: 'precision',
            target: target,
            precision: precision,
            timestamp: new Date(),
            success: this.calculatePrecisionSuccess(precision)
        };

        this.logAttack(attackParams);
        return attackParams;
    }

    // Калькулятор успеха прямой атаки
    calculateAttackSuccess(intensity) {
        // Простой расчет успеха с учетом интенсивности
        const baseSuccessChance = 0.5;
        return Math.min(baseSuccessChance * intensity, 1.0);
    }

    // Калькулятор успеха атаки из засады
    calculateAmbushSuccess(stealthFactor) {
        // Успех зависит от фактора скрытности
        const baseSuccessChance = 0.7;
        return Math.min(baseSuccessChance * stealthFactor, 1.0);
    }

    // Калькулятор успеха высокоточной атаки
    calculatePrecisionSuccess(precision) {
        // Высокоточная атака с зависимостью от точности
        const baseSuccessChance = 0.8;
        return Math.min(baseSuccessChance * precision, 1.0);
    }

    // Выполнение атаки с выбранной стратегией
    executeAttack(strategy, target, params = {}) {
        if (!this.attackStrategies[strategy]) {
            throw new Error(`Unknown attack strategy: ${strategy}`);
        }

        return this.attackStrategies[strategy].call(this, target, params.intensity);
    }

    // Логирование атаки
    logAttack(attackData) {
        // В реальной системе можно реализовать логирование в базу данных или файл
        console.log(`Attack Log: ${JSON.stringify(attackData)}`);
        
        // Опциональное обновление контекста или статистики
        if (this.context && this.context.updateAttackStats) {
            this.context.updateAttackStats(attackData);
        }
    }

    // Анализ эффективности атак
    analyzeAttackEffectiveness(attackHistory) {
        if (!attackHistory || attackHistory.length === 0) {
            return {
                totalAttacks: 0,
                successRate: 0,
                strategyEffectiveness: {}
            };
        }

        const totalAttacks = attackHistory.length;
        const successfulAttacks = attackHistory.filter(attack => attack.success).length;
        
        const strategyEffectiveness = attackHistory.reduce((stats, attack) => {
            stats[attack.type] = stats[attack.type] || { total: 0, successful: 0 };
            stats[attack.type].total++;
            if (attack.success) stats[attack.type].successful++;
            return stats;
        }, {});

        // Преобразование статистики стратегий
        Object.keys(strategyEffectiveness).forEach(strategy => {
            const { total, successful } = strategyEffectiveness[strategy];
            strategyEffectiveness[strategy] = (successful / total) * 100;
        });

        return {
            totalAttacks,
            successRate: (successfulAttacks / totalAttacks) * 100,
            strategyEffectiveness
        };
    }
}