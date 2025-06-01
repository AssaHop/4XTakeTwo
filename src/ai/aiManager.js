// 📁 src/ai/aiManager.js
import { AttackActions } from './actions/attackActions.js';
import { MoveActions } from './actions/moveActions.js';
import { EconomicActions } from './actions/economicActions.js';

// 🔍 Фильтрация AI-юнитов
function getAIUnits(units) {
    return units.filter(u => u.owner?.startsWith('enemy'));
}

/**
 * 📦 Основной обработчик хода AI
 * Использует стратегический FSM и эвристические оценки
 */
export async function runAIForTurn(gameState) {
    const aiUnits = getAIUnits(gameState.units);
    console.log('🧳 AI Units found:', aiUnits.length);

    // Инициализация менеджеров действий
    const attackManager = new AttackActions(gameState);
    const moveManager = new MoveActions(gameState);
    const economyManager = new EconomicActions(gameState);

    for (const unit of aiUnits) {
        console.log(`🔍 ${unit.type} at (${unit.q},${unit.r},${unit.s}) | owner=${unit.owner} | HP=${unit.hp}/${unit.maxHp} | act=${unit.canAct}, move=${unit.canMove}`);

        // Выбор стратегии на основе FSM состояния
        const fsm = unit.fsm || 'ATTACK';
        console.log('🧠 FSM Strategy:', fsm);

        try {
            switch (fsm) {
                case 'ATTACK':
                    await attackManager.executeAttackStrategy(unit);
                    break;
                case 'MOVE':
                    await moveManager.executeMoveStrategy(unit);
                    break;
                case 'ECONOMY':
                    await economyManager.executeEconomicStrategy(unit);
                    break;
                default:
                    console.warn(`🚨 Неизвестная стратегия FSM: ${fsm}`);
            }
        } catch (error) {
            console.error(`🔥 Ошибка выполнения стратегии для ${unit.type}:`, error);
        }
    }

    // Глобальная оценка состояния и адаптация стратегии
    this.evaluateAndAdaptGlobalStrategy(gameState);
}

/**
 * Глобальная оценка и адаптация стратегии AI
 */
function evaluateAndAdaptGlobalStrategy(gameState) {
    // TODO: Реализовать глобальную стратегическую оценку
    // - Анализ ресурсов
    // - Оценка угроз
    // - Корректировка глобальной стратегии
    console.log('🌐 Глобальная стратегическая оценка');
}

export default {
    runAIForTurn,
    evaluateAndAdaptGlobalStrategy
};