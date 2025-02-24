import { generateMap } from '../world/map.js';
import { renderMap } from '../ui/render.js';
import { Unit } from '../mechanics/units.js';
import { setupUI } from '../ui/setup.js';
import { setupEventListeners } from '../ui/events.js';

let map = [];
const units = [];
const squashFactor = 0.7; // Константа squashFactor

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    showMenu();
    const rootStyles = getComputedStyle(document.documentElement);
    const hexRadius = parseFloat(rootStyles.getPropertyValue('--hex-radius'));
    const hexHeight = squashFactor * 2 * hexRadius; // Высота гексагона
    const hexWidth = Math.sqrt(3) * hexRadius; // Ширина гексагона

    const topPercentage = 15.01;
    const bottomPercentage = 85.01;
    const leftPercentage = 0;
    const rightPercentage = 100.2;
    const middleTopPercentage = 32.5;
    const middleBottomPercentage = 67.5;

    document.documentElement.style.setProperty('--hex-clip-top-left', `${leftPercentage}% ${middleTopPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-top-right', `${rightPercentage}% ${middleTopPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-bottom-right', `${rightPercentage}% ${middleBottomPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-bottom-left', `${leftPercentage}% ${middleBottomPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-top', `50% ${topPercentage}%`); // Верхняя центральная вершина
    document.documentElement.style.setProperty('--hex-clip-bottom', `50% ${bottomPercentage}%`); // Нижняя центральная вершина
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
    map = generateMap(size);
    renderMap(map); // Вызов рендеринга карты, логика остается в render.js
    setupEventListeners();
}

window.startGame = startGame; // Убедимся, что функция доступна глобально
export { units, map };