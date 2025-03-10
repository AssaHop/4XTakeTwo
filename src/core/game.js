// 📂 game.js — основной файл инициализации

// 📂 game.js — основной файл инициализации

import { renderMap, renderUnits } from '../ui/render.js';
import { generateScenario, getInitialUnitsForScenario } from '../scenarios/scenarios.js';
import { generateUnits } from '../mechanics/units.js';
import { setupUI } from '../ui/setup.js';
import { setupEventListeners, updateEndTurnButton } from '../ui/events.js'; // ✅ добавлено сюда
import { state } from '../core/state.js';
import { loadGameState, saveGameState } from '../core/savegame.js';


// 📌 Параметры
let scale = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let mapOffsetX = 0;
let mapOffsetY = 0;

// 📌 Центрирование карты
function updateMapOffset() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    mapOffsetX = canvas.width / 2;
    mapOffsetY = canvas.height / 2;
    offset.x = mapOffsetX;
    offset.y = mapOffsetY;
}

// 📌 Меню
function showMenu() {
    document.getElementById('menu-container').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
}

// 📌 Запуск игры
function startGame(size = 2, scenarioName = 'default') {
    document.getElementById('menu-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    initGame(size, scenarioName);
}

function initGame(size, scenarioName = 'default') {
    updateMapOffset();

    // 📦 Генерация карты
    state.map = generateScenario(scenarioName, size);

    if (!state.map || state.map.length === 0) {
        console.error('❌ Map generation failed');
        return;
    }

    // 📦 Получаем начальных юнитов для сценария
    const unitsList = getInitialUnitsForScenario(scenarioName, state.map);
    console.log('🧍 Units to generate:', unitsList);

    if (!unitsList || unitsList.length === 0) {
        console.warn('⚠️ No units defined for scenario, skipping unit generation.');
    }

    generateUnits(unitsList);
    console.log('🧍 Units after generate:', state.units);

    renderMap(scale, offset);
    renderUnits(scale, offset);
    setupEventListeners();

    // 💡 Сброс состояния кнопки "End Turn"
    updateEndTurnButton(false);

    console.log(`✅ Game initialized: scenario=${scenarioName}, size=${size}`);
}

// 📌 Настройка canvas
function setupCanvas() {
    const canvas = document.getElementById('game-canvas');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    updateMapOffset();
}

// 📌 Масштабирование
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

// 📌 Перетаскивание карты
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

// 📦 Сохранение/Загрузка
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

// 📐 Обновление при resize
window.addEventListener('resize', () => {
    setupCanvas();
    renderMap(state.scale, state.offset);
    renderUnits(state.scale, state.offset);
});

// 🏁 Инициализация
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    window.requestAnimationFrame(() => {
        setupCanvas();
        showMenu();
        setupZoomControls();
        setupDragControls();
        startGame(2, 'default');
    });
});

// Экспорт для тестов/отладки
window.startGame = startGame;
window.saveGame = saveGame;
window.loadGame = loadGame;

export { state, scale, mapOffsetX, mapOffsetY };
