export class AttackActions {
    constructor(context) {
        this.context = context;
    }

    async executeAttack(unit, target) {
        if (!unit || !target) {
            console.warn('⚠️ Отсутствует юнит или цель для атаки');
            return null;
        }

        const attackResult = {
            type: 'attack',
            attacker: unit,
            target: target,
            timestamp: new Date(),
            success: this.calculateSuccess(unit, target)
        };

        this.logAttack(attackResult);
        return attackResult;
    }

    async executeAction(action) {
        return this.executeAttack(action.unit, action.target);
    }

    calculateSuccess(unit, target) {
        return unit.strength >= target.strength;
    }

    logAttack(data) {
        console.log(`🗡️ Attack: ${data.attacker.type} атакует ${data.target.type} → ${data.success ? 'УСПЕШНО' : 'НЕУДАЧНО'}`);

        if (this.context && this.context.updateAttackStats) {
            this.context.updateAttackStats(data);
        }
    }
}    
