import { renderMap, renderUnits } from '../ui/render.js';
import { generateScenario, getInitialUnitsForScenario } from '../scenarios/scenarios.js';
import { generateUnits } from '../mechanics/units.js';
import { setupUI } from '../ui/setup.js';
import { setupEventListeners } from '../ui/events.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { state } from './state.js';
import { loadGameState, saveGameState } from './savegame.js';
import { transitionTo, GameState } from './gameStateMachine.js';
import { initProgressionSystem } from '../mechanics/progressionSystem.js';

let scale = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let mapOffsetX = 0;
let mapOffsetY = 0;

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

  // ✅ передаём profile = mapType
  const map = generateScenario(scenarioName, { size, profile: mapType });
  state.map = map;

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

  renderMap(scale, offset);
  renderUnits(scale, offset);
  updateEndTurnButton();
  setupEventListeners();
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
