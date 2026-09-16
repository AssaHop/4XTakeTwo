import { renderMap, renderUnits } from '../ui/render.js';
import { generateScenario, getInitialUnitsForScenario, getInitialCapturePointsForScenario, getScenarioById } from '../scenarios/scenarios.js';
import { generateUnits } from '../mechanics/units.js';
import { setupUI } from '../ui/setup.js';
import { setupEventListeners, redraw } from '../ui/events.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { setupEconomyPanel, updateEconomyPanel } from '../ui/economyPanel.js';
import { state } from './state.js';
import { loadGameState, saveGameState } from './savegame.js';
import { transitionTo, GameState } from './gameStateMachine.js';
import { initProgressionSystem } from '../mechanics/progressionSystem.js';
import { initMapIndex } from '../utils/initMapIndex.js';
import { runAIForTurn, resetAIState } from '../ai/aiManager.js';
import { initAllegiance } from './diplomacy.js';
import { updateVisibility } from '../world/fogOfWar.js';
import { cubeToPixel } from '../world/map.js';

let scale = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let mapOffsetX = 0;
let mapOffsetY = 0;
// Тот же squashFactor, что render.js/events.js применяют к y отдельным
// ctx.scale(1, squashFactor) ПОСЛЕ translate — при вычислении offset для
// центрирования камеры на конкретном гексе (см. centerCameraOnPlayerStart)
// его надо учитывать так же, иначе смещение по Y будет неверным.
const squashFactor = 0.7;

function updateMapOffset() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  mapOffsetX = canvas.width / 2;
  mapOffsetY = canvas.height / 2;
  offset.x = mapOffsetX;
  offset.y = mapOffsetY;
  state.offset = { ...offset };
}

// Камера по умолчанию центрируется на гекс (0,0,0) — центр карты
// (см. updateMapOffset выше). Раньше этого хватало (карты небольшие,
// старт примерно по центру), но territory/skirmish (сессия 11) намеренно
// разносят домашние базы к краям/углам БОЛЬШОЙ карты (max-min выбор) —
// база физически видна (открыта туманом с первого хода), но камера по
// умолчанию смотрит в центр карты, а не туда, где реально стоит флот
// игрока — база оказывается за пределами экрана. Найдено пользователем
// в реальном запуске 2026-09-16 ("не вижу свою базу в начале игры").
// Центрируем на среднюю позицию ЮНИТОВ игрока (не на саму точку захвата
// напрямую — юниты стоят на воде РЯДОМ с ней, но с руки будет то же
// самое место на экране).
function centerCameraOnPlayerStart() {
  const playerUnits = state.units.filter(u => u.owner === 'player1');
  if (!playerUnits.length) return;

  const avgQ = playerUnits.reduce((sum, u) => sum + u.q, 0) / playerUnits.length;
  const avgR = playerUnits.reduce((sum, u) => sum + u.r, 0) / playerUnits.length;
  const avgS = -avgQ - avgR;
  const { x, y } = cubeToPixel(avgQ, avgR, avgS, 0, 0);

  offset.x = mapOffsetX - x * scale;
  offset.y = mapOffsetY - y * scale * squashFactor;
  state.offset = { ...offset };
}

function showMenu() {
  document.getElementById('menu-container').style.display = 'block';
  document.getElementById('game-container').style.display = 'none';
}

function startGame(size = 15, scenarioName = 'dominator', enemyCount = 2, mapType = 'default') {
  document.getElementById('menu-container').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  initGame(size, scenarioName, enemyCount, mapType); // ✅ добавлен mapType
}

function initGame(size = 15, scenarioName = 'dominator', enemyCount = 2, mapType = 'default') {
  updateMapOffset();

  // enemyCount передаётся сюда же (не только в getInitialUnits/CapturePoints
  // ниже) — сценариям вроде territory/skirmish число игроков нужно ДО
  // генерации террейна, чтобы посчитать сколько точек-семян разбрасывать
  // (см. territoryScenarioFactory.js:generateSeededTerritoryMap). Старым
  // сценариям (dominator/conqueror) это поле просто не нужно, игнорируется.
  const map = generateScenario(scenarioName, { size, profile: mapType, enemyCount });
  state.map = map;

  // ✅ Добавляем индекс для AI, pathfinding, LoS
  state.mapIndex = initMapIndex(map);
  state.capturePoints = getInitialCapturePointsForScenario(scenarioName, state.mapIndex, { enemyCount });
  state.initTurnOrder(enemyCount);
  state.scenario = getScenarioById(scenarioName);
  state.allegiance = state.scenario.getInitialAllegiance
    ? state.scenario.getInitialAllegiance(state.turnOrder)
    : initAllegiance(state.turnOrder);
  state.gameOver = false;
  state.fog = {};
  state.resources = {};
  resetAIState();

  if (!map || map.length === 0) {
    console.error('❌ Map generation failed');
    return;
  }

  const unitsList = getInitialUnitsForScenario(scenarioName, map, { enemyCount });
  console.log('🧍 Units to generate:', unitsList);

  if (!unitsList || unitsList.length === 0) {
    console.warn('⚠️ No units defined for scenario, skipping unit generation.');
  } else {
    generateUnits(unitsList);
  }

  centerCameraOnPlayerStart();
  updateVisibility(state, 'player1');
  renderMap(scale, offset);
  renderUnits(scale, offset);
  updateEndTurnButton();
  setupEventListeners();
  setupEconomyPanel(redraw);
  updateEconomyPanel();
  initProgressionSystem(state);

  transitionTo(GameState.IDLE);
  console.log(`✅ Game initialized: scenario=${scenarioName}, size=${size}, enemies=${enemyCount}, mapType=${mapType}`);
}

function setupCanvas() {
  const canvas = document.getElementById('game-canvas');
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  updateMapOffset();
}

function setupZoomControls() {
  const canvas = document.getElementById('game-canvas');
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    applyZoom(zoomFactor, event.clientX, event.clientY);
  });
}

function applyZoom(zoomFactor, cursorX, cursorY) {
  const canvas = document.getElementById('game-canvas');
  const rect = canvas.getBoundingClientRect();
  const fixedX = cursorX - rect.left;
  const fixedY = cursorY - rect.top;

  const worldXBefore = (fixedX - state.offset.x) / state.scale;
  const worldYBefore = (fixedY - state.offset.y) / state.scale;

  state.scale *= zoomFactor;
  state.offset.x = fixedX - worldXBefore * state.scale;
  state.offset.y = fixedY - worldYBefore * state.scale;

  requestAnimationFrame(() => {
    renderMap(state.scale, state.offset);
    renderUnits(state.scale, state.offset);
  });
}

function setupDragControls() {
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
      isDragging = true;
      dragStart.x = event.clientX - state.offset.x;
      dragStart.y = event.clientY - state.offset.y;
    }
  });

  canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
      state.offset.x = event.clientX - dragStart.x;
      state.offset.y = event.clientY - dragStart.y;
      requestAnimationFrame(() => {
        renderMap(state.scale, state.offset);
        renderUnits(state.scale, state.offset);
      });
    }
  });

  canvas.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

function saveGame() {
  saveGameState();
}

function loadGame() {
  const loaded = loadGameState();
  if (loaded) {
    renderMap(state.scale, state.offset);
    renderUnits(state.scale, state.offset);
  }
}

window.addEventListener('resize', () => {
  setupCanvas();
  renderMap(state.scale, state.offset);
  renderUnits(state.scale, state.offset);
});

document.addEventListener('DOMContentLoaded', () => {
  setupUI();

  window.requestAnimationFrame(() => {
    setupCanvas();
    showMenu();
    setupZoomControls();
    setupDragControls();

    const backButton = document.getElementById('back-to-menu-button');
    if (backButton) {
      backButton.addEventListener('click', () => {
        showMenu();
      });
    }
  });
});

// 🪄 Exposed for debug
window.startGame = startGame;
window.saveGame = saveGame;
window.loadGame = loadGame;

export { state, scale, mapOffsetX, mapOffsetY, startGame };
