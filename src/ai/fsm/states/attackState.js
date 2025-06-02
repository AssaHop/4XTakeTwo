// src/ai/fsm/states/attackState.js
import { UnitEvaluator } from '../../evaluators/unitEvaluator.js';
import { ThreatEvaluator } from '../../evaluators/threatEvaluator.js';

export class AttackState {
    constructor(gameState) {
        this.gameState = gameState;
        this.unitEvaluator = new UnitEvaluator();
        this.threatEvaluator = new ThreatEvaluator();
    }

    execute() {
        const aiUnits = this.gameState.units.filter(
            unit => unit.owner.startsWith('enemy')
        );

        const actions = [];

        for (const unit of aiUnits) {
            const threatLevel = this.threatEvaluator.evaluateThreatLevel(unit, this.gameState);

            if (unit.hp < unit.maxHp * 0.3 || threatLevel > 2.5) {
                actions.push({ type: 'idle', unit });
                continue;
            }

            const enemyUnits = this.gameState.units.filter(
                u => !u.owner.startsWith('enemy')
            );

            let bestTarget = null;
            let bestScore = -Infinity;

            for (const target of enemyUnits) {
                const score = this.unitEvaluator.evaluateAttackAction(unit, target, this.gameState);
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = target;
                }
            }

            if (!bestTarget) {
                actions.push({ type: 'idle', unit });
                continue;
            }

            const distance = this.getDistance(unit, bestTarget);

            if (distance <= unit.atRange) {
                actions.push({ type: 'attack', unit, target: bestTarget });
            } else if (distance <= unit.moRange + unit.atRange) {
                const step = this.stepToward(unit, bestTarget);
                actions.push({ type: 'move', unit, destination: step });
            } else {
                actions.push({ type: 'idle', unit });
            }
        }

        return actions;
    }

    getDistance(a, b) {
        return Math.max(
            Math.abs(a.q - b.q),
            Math.abs(a.r - b.r),
            Math.abs(a.s - b.s)
        );
    }

    stepToward(unit, target) {
        // Простая реализация — один шаг по направлению
        const dq = Math.sign(target.q - unit.q);
        const dr = Math.sign(target.r - unit.r);
        const ds = Math.sign(target.s - unit.s);

        return { q: unit.q + dq, r: unit.r + dr, s: unit.s + ds };
    }
} 
