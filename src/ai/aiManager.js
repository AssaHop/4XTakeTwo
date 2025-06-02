import { StrategyFSM } from './fsm/strategyFSM.js';
import { AttackActions } from './actions/attackActions.js';
import { MoveActions } from './actions/moveActions.js';
import { EconomicActions } from './actions/economicActions.js';

let fsm = null;

export async function runAIForTurn(gameState) {
  if (gameState.currentPlayer !== 'enemy') {
    console.warn('🚨 Попытка запуска AI вне его хода');
    return;
  }

  if (!fsm) {
    fsm = new StrategyFSM(gameState);
  }

  const actions = fsm.update();
  console.log('🧠 FSM сгенерировал действий:', actions.length);

  const attackManager = new AttackActions(gameState);
  const moveManager = new MoveActions(gameState);
  const economyManager = new EconomicActions(gameState);

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'attack':
          await attackManager.executeAction(action);
          break;
        case 'move':
        case 'expand':
        case 'defend':
          await moveManager.executeAction(action);
          break;
        case 'build':
          await economyManager.executeAction(action);
          break;
        case 'idle':
          if (action.unit) {
            console.log(`🛑 ${action.unit.type} (${action.unit.q},${action.unit.r},${action.unit.s}) отдыхает`);
          } else {
            console.log(`🛑 Неизвестный юнит отдыхает`);
          }
          break;
        default:
          console.warn(`⚠️ Неизвестный тип действия: ${action.type}`);
      }
    } catch (err) {
      console.error(`🔥 Ошибка при выполнении действия ${action.type}`, err);
    }
  }
}
