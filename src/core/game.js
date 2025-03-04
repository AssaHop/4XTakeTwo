import { generateHexMap } from '../world/map.js';
import { renderMap, renderUnits } from '../ui/render.js';
import { addUnit } from '../mechanics/units.js';
import { setupUI } from '../ui/setup.js';
import { setupEventListeners } from '../ui/events.js';
import { state } from '../core/state.js';

// Центральная точка карты в пикселях
let mapOffsetX = 624;
let mapOffsetY = 396.5;

let scale = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    showMenu();
    setupZoomControls();
    setupDragControls();
    startGame(2); // Устанавливаем начальный размер сетки
});

function showMenu() {
    document.getElementById('menu-container').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
}

function startGame(size) {
    document.getElementById('menu-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    initGame(size);
}

function initGame(size) {
    state.map = generateHexMap(size);
    if (!state.map || state.map.length === 0) {
        console.error('Map generation failed');
        console.log('Generated map:', state.map);
        return;
    }
    console.log('Generated map:', state.map);
    renderMap(scale, offset);
    addUnit(0, 0, 0, 'soldier', 'player1');
    addUnit(1, -1, 0, 'archer', 'player2');
    renderUnits(scale, offset);
    setupEventListeners();
}

function setupZoomControls() {
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (event.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    });
}

function setupDragControls() {
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 2) { // Проверка на правую кнопку мыши
            isDragging = true;
            dragStart.x = event.clientX - offset.x;
            dragStart.y = event.clientY - offset.y;
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isDragging) {
            offset.x = event.clientX - dragStart.x;
            offset.y = event.clientY - dragStart.y;
            renderMap(scale, offset);
            renderUnits(scale, offset);
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 2) { // Проверка на правую кнопку мыши
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Отключение контекстного меню при правом клике
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
}

function zoomIn() {
    scale += 0.1;
    renderMap(scale, offset);
    renderUnits(scale, offset);
}

function zoomOut() {
    scale = Math.max(0.1, scale - 0.1);
    renderMap(scale, offset);
    renderUnits(scale, offset);
}

// Убедимся, что функция доступна глобально
window.startGame = startGame;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;

export { state, mapOffsetX, mapOffsetY };