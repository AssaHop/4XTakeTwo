import { generateHexMap } from '../world/map.js';
import { renderMap, renderUnits } from '../ui/render.js'; // Импортируем renderUnits
import { addUnit } from '../mechanics/units.js'; // Импортируем addUnit
import { setupUI } from '../ui/setup.js';
import { setupEventListeners } from '../ui/events.js';
import { state } from '../core/state.js'; // Импортируем state

let scale = 1; // Переменная для хранения текущего масштаба
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    showMenu();
    setupZoomControls();
    setupDragControls();
    startGame(5); // Устанавливаем начальный размер сетки равным 15
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
    state.map = generateHexMap(size); // Сохраняем карту в state.map
    if (!state.map || state.map.length === 0) {
        console.error('Map generation failed');
        console.log('Generated map:', state.map);
        return;
    }
    console.log('Generated map:', state.map);
    renderMap(scale, offset); // Передаем текущий масштаб и смещение
    addUnit(0, 0, 0, 'soldier', '#ff0000'); // Добавляем юнита
    addUnit(1, -1, 0, 'archer', '#00ff00'); // Добавляем юнита
    renderUnits(scale, offset); // Отрисовываем юнитов
    setupEventListeners(); // Настраиваем обработчики событий
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
        isDragging = true;
        dragStart.x = event.clientX - offset.x;
        dragStart.y = event.clientY - offset.y;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isDragging) {
            offset.x = event.clientX - dragStart.x;
            offset.y = event.clientY - dragStart.y;
            renderMap(scale, offset);
            renderUnits(scale, offset); // Перерисовываем юнитов при перемещении карты
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

function zoomIn() {
    scale += 0.1;
    renderMap(scale, offset); // Перерисовываем карту с новым масштабом
    renderUnits(scale, offset); // Перерисовываем юнитов с новым масштабом
}

function zoomOut() {
    scale = Math.max(0.1, scale - 0.1); // Минимальный масштаб 0.1
    renderMap(scale, offset); // Перерисовываем карту с новым масштабом
    renderUnits(scale, offset); // Перерисовываем юнитов с новым масштабом
}

window.startGame = startGame; // Убедимся, что функция доступна глобально
window.zoomIn = zoomIn; // Убедимся, что функция доступна глобально
window.zoomOut = zoomOut; // Убедимся, что функция доступна глобально
export { state };