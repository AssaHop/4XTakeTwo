import { selectUnit, generateUnits, Unit } from '../mechanics/units.js';
import { pixelToCube, cubeRound } from '../world/map.js';
import { state } from '../core/state.js';
import { GameState, transitionTo, evaluatePostAction } from '../core/gameStateMachine.js';
import { setupEndTurnButton, updateEndTurnButton } from './uiControls.js';
import { renderUnits } from './render.js';
import { highlightUnitContext } from './highlightManager.js';
import { performAttack } from '../core/combatLogic.js';
import { runAIForTurn } from '../ai/aiManager.js'; // 🔄 Новый AI вход

const squashFactor = 0.7;

function setupEventListeners() {
  const canvas = document.getElementById('game-canvas');
  canvas.addEventListener('click', handleCanvasClick);
  setupEndTurnButton(handleEndTurn);
  console.log('🎯 Event listeners setup initialized');
}

function cubeEqualsWithEpsilon(a, b, epsilon = 0.1) {
  return Math.abs(a.q - b.q) < epsilon &&
         Math.abs(a.r - b.r) < epsilon &&
         Math.abs(a.s - b.s) < epsilon;
}

function handleCanvasClick(event) {
  const rect = event.target.getBoundingClientRect();
  const x = (event.clientX - rect.left - state.offset.x) / state.scale;
  const y = (event.clientY - rect.top - state.offset.y) / state.scale / squashFactor;

  const clickedCube = pixelToCube(x, y);
  const rounded = cubeRound(clickedCube);
  const { q, r, s } = rounded;

  const clickedUnit = state.units.find(unit => cubeEqualsWithEpsilon(unit, { q, r, s }));

  // 👇 ATTACK
  if (clickedUnit) {
    if (clickedUnit.owner !== 'player1') {
      const selected = state.selectedUnit;
      if (selected && selected.canAct) {
        const attackTargets = Unit.getAttackableHexes(selected);
        const validTarget = attackTargets.find(t => t.q === q && t.r === r && t.s === s);
        if (validTarget) {
          performAttack(selected, clickedUnit); // FSM обработает post-action
          return;
        }
      }
      return;
    }

    // ✅ SELECT FRIENDLY
    const canSelect = clickedUnit.canAct || clickedUnit.canMove || (clickedUnit.canRepeatAttackOnKill && clickedUnit.lastAttackWasKill);
    if (canSelect) {
      selectUnit(clickedUnit);
      transitionTo(GameState.UNIT_SELECTED);
    } else {
      console.log('⚠️ Clicked unit cannot act or has no actions left.');
    }
    return;
  }

  // 👇 MOVE
  const selected = state.selectedUnit;
  if (selected && selected.canMove) {
    const available = selected.getAvailableHexes();
    const inRange = available.find(h => cubeEqualsWithEpsilon(h, { q, r, s }));
    if (inRange) {
      const moved = selected.moveTo(q, r, s);
      if (moved) {
        console.log(`🚶 Unit moved to: (${q}, ${r}, ${s})`);
        renderUnits();
        evaluatePostAction(selected, { type: 'move' }); // FSM возьмет управление
        return;
      }
    }
  }

  console.log('❌ Clicked hex: No valid action.');
}

function handleEndTurn() {
  console.log('🔚 End turn clicked');

  // Сбросить действия всех юнитов
  state.units.forEach(unit => unit.resetActions?.());
  state.hasActedThisTurn = false;
  updateEndTurnButton();

  // 🎯 Переход в фазу AI
  transitionTo(GameState.ENEMY_TURN);

  // 🧠 Запуск FSM + Behavior Tree AI
  setTimeout(() => {
    runAIForTurn(state);      // ✅ ЗАПУСК AI
    renderUnits();            // 🔁 Обновить отрисовку
    updateEndTurnButton(true);
    transitionTo(GameState.IDLE); // ⬅️ Вернуться в IDLE
  }, 300);
}


export { setupEventListeners };
