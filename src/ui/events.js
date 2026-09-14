import { selectUnit, Unit } from '../mechanics/units.js';
import { pixelToCube, cubeRound } from '../world/map.js';
import { state } from '../core/state.js';
import { GameState, transitionTo, evaluatePostAction } from '../core/gameStateMachine.js';
import { setupEndTurnButton, updateEndTurnButton } from './uiControls.js';
import { renderMap, renderUnits } from './render.js';
import { highlightUnitContext, clearAllHighlights } from './highlightManager.js';
import { performAttack } from '../core/combatLogic.js';
import { runAIForTurn } from '../ai/aiManager.js';
import { updateCapturePoints } from '../core/captureLogic.js';
import { processAviationTurn } from '../core/aviationLogic.js';
import { tickResourcesForOwner } from '../core/economyLogic.js';
import { updateEconomyPanel } from './economyPanel.js';
import { updateVisibility } from '../world/fogOfWar.js';

const squashFactor = 0.7;

function checkEndConditions() {
  if (state.gameOver || !state.scenario) return;
  if (state.scenario.winCondition?.(state)) {
    state.gameOver = true;
    setTimeout(() => alert('🏆 Победа! Все враги уничтожены.'), 50);
  } else if (state.scenario.loseCondition?.(state)) {
    state.gameOver = true;
    setTimeout(() => alert('💀 Поражение! Ваш флот уничтожен.'), 50);
  }
}

// 🎨 Централизованный рендер после любого действия
function redraw() {
  // Игрок всегда смотрит на карту со своей видимостью, независимо от того,
  // чей сейчас ход — только его юниты определяют, что нарисовано.
  updateVisibility(state, 'player1');
  renderMap(state.scale, state.offset);
  renderUnits(state.scale, state.offset);
  updateEconomyPanel();
}

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
  if (state.gameOver) return;
  // Блокируем клики во время хода AI
  if (state.isAITurn()) return;

  const rect = event.target.getBoundingClientRect();
  const x = (event.clientX - rect.left - state.offset.x) / state.scale;
  const y = (event.clientY - rect.top - state.offset.y) / state.scale / squashFactor;

  const clickedCube = pixelToCube(x, y);
  const rounded = cubeRound(clickedCube);
  const { q, r, s } = rounded;

  // 👇 SELECT OWN CAPTURE POINT (для панели спауна/апгрейда — economyPanel.js
  // раньше всегда брала ПЕРВУЮ свою точку в state.capturePoints, что на
  // практике означало НАВСЕГДА домашнюю (она первая в массиве с самого
  // начала партии, порядок массива не меняется при смене владельца) —
  // игрок физически не мог тратить токены у другой захваченной точки.
  // Клик по своей точке захвата явно выбирает её как цель трат.
  const clickedCP = (state.capturePoints || []).find(cp =>
    cp.owner === 'player1' && cubeEqualsWithEpsilon(cp, { q, r, s })
  );
  if (clickedCP) {
    state.selectedCP = clickedCP;
    redraw();
    return;
  }

  const clickedUnit = state.units.find(unit => cubeEqualsWithEpsilon(unit, { q, r, s }));

  // 👇 ATTACK
  if (clickedUnit) {
    if (clickedUnit.owner !== 'player1') {
      const selected = state.selectedUnit;
      if (selected && selected.canAct) {
        const attackTargets = Unit.getAttackableHexes(selected);
        const validTarget = attackTargets.find(t => t.q === q && t.r === r && t.s === s);
        if (validTarget) {
          performAttack(selected, clickedUnit);
          redraw();
          checkEndConditions();
          updateEndTurnButton();
          return;
        }
      }
      return;
    }

    // ✅ SELECT FRIENDLY
    const canSelect = clickedUnit.canAct || clickedUnit.canMove ||
      (clickedUnit.hasModule?.('Percy') && clickedUnit.lastAttackWasKill);
    if (canSelect) {
      selectUnit(clickedUnit);
      transitionTo(GameState.UNIT_SELECTED);
      redraw();
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
        redraw();
        updateEndTurnButton();
        return;
      }
    }
  }

  console.log('❌ Clicked hex: No valid action.');
}

// 🔄 Запускает ходы AI по очереди пока не дойдёт до player1
// Задержка в мс между ходами AI — чтобы видеть что происходит
const AI_TURN_DELAY = 600;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAISequence() {
  while (state.isAITurn()) {
    const currentAI = state.currentPlayer;
    console.log(`🤖 AI ход: ${currentAI}`);
    transitionTo(GameState.ENEMY_TURN);

    // Сбрасываем действия юнитов ЭТОГО AI перед его ходом
    state.resetUnitsForPlayer(currentAI);

    // Туман этого AI — от позиций его юнитов на СТАРТ его хода (не в
    // реальном времени внутри хода — упрощение, см. docs/content-status.md).
    updateVisibility(state, currentAI);

    // Авиация: тикаем lifeTurns, WCA спаунит новый юнит (новый видит действия в этом ходу)
    processAviationTurn(state, currentAI);

    // Экономика: начисляем токены за уже захваченные точки. Решение
    // тратить ли их на спаун и на что именно принимается внутри
    // runAIForTurn() — spawn теперь кандидат в общем пуле AttackState,
    // не отдельный шаг (см. attackState.js:decideSpawnAction).
    tickResourcesForOwner(state, currentAI);

    // Пауза перед ходом — видно кто ходит
    await sleep(AI_TURN_DELAY);

    await runAIForTurn(state, currentAI);
    redraw();
    checkEndConditions();
    if (state.gameOver) return;

    // Пауза после хода — видно результат
    await sleep(AI_TURN_DELAY);

    updateCapturePoints(state);
    state.nextTurn();
    console.log(`➡️ Следующий игрок: ${state.currentPlayer}`);
  }

  // Вернулись к player1 — сбрасываем его юниты
  state.resetUnitsForPlayer('player1');
  updateEndTurnButton();
  transitionTo(GameState.IDLE);
  console.log('👤 Ход игрока');
}

async function handleEndTurn() {
  if (state.gameOver) return;
  if (state.isAITurn()) return; // защита от двойного клика

  console.log('🔚 End turn clicked');

  // Сбросить выделение
  state.selectedUnit = null;
  clearAllHighlights();

  // Переход к следующему игроку
  updateCapturePoints(state);
  processAviationTurn(state, 'player1');
  tickResourcesForOwner(state, 'player1'); // тратит игрок сам, кнопкой — см. uiControls.js
  state.nextTurn();
  updateEndTurnButton();

  if (state.isAITurn()) {
    // Небольшая задержка чтобы UI успел обновиться
    setTimeout(() => runAISequence(), 200);
  }
}

export { setupEventListeners, redraw };
