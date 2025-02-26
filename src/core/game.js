import { generateHexMap } from '../world/map.js';
import { renderMap } from '../ui/render.js';
import { Unit } from '../mechanics/units.js';
import { setupUI } from '../ui/setup.js';
import { setupEventListeners } from '../ui/events.js';

let map = [];
const units = [];
let scale = 1; // Переменная для хранения текущего масштаба

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    showMenu();
    setupZoomControls();
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
    map = generateHexMap(size);
    renderMap(scale); // Передаем текущий масштаб
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

function zoomIn() {
    scale += 0.1;
    renderMap(scale); // Перерисовываем карту с новым масштабом
}

function zoomOut() {
    scale = Math.max(0.1, scale - 0.1); // Минимальный масштаб 0.1
    renderMap(scale); // Перерисовываем карту с новым масштабом
}

window.startGame = startGame; // Убедимся, что функция доступна глобально
window.zoomIn = zoomIn; // Убедимся, что функция доступна глобально
window.zoomOut = zoomOut; // Убедимся, что функция доступна глобально
export { units, map };