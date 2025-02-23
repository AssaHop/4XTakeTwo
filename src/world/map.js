import { Unit } from './units.js'; // Импорт класса Unit
import { units } from './main.js'; // Импорт массива units
import { updateEndTurnButton } from './ui.js';

const map = [];
const HEX_RADIUS = 40;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS; // Ширина гекса после поворота на 30 градусов
const HEX_HEIGHT = 2 * HEX_RADIUS; // Высота гекса после поворота на 30 градусов
const HEX_VERTICAL_SPACING = HEX_HEIGHT * 3 / 4; // Вертикальный шаг между гексами
const HEX_HORIZONTAL_SPACING = HEX_WIDTH; // Горизонтальный шаг между гексами

function axialToPixel(q, r, offsetX, offsetY) {
    const x = HEX_WIDTH * (q + r / 2) + offsetX;
    const y = HEX_VERTICAL_SPACING * r + offsetY;
    return { x, y };
}

function generateMap(size) {
    map.length = 0;
    for (let q = -size; q <= size; q++) {
        const rowArray = [];
        for (let r = -size; r <= size; r++) {
            if (Math.abs(q + r) <= size) {
                const cell = {
                    q: q,
                    r: r,
                    type: Math.random() > 0.2 ? 'walkable' : 'non-walkable'
                };
                rowArray.push(cell);
            }
        }
        map.push(rowArray);
    }
    console.log('Map generated:', map);
    renderMap();
}

function generateUnits(numUnits) {
    units.length = 0;
    let generatedUnits = 0;
    while (generatedUnits < numUnits) {
        const q = Math.floor(Math.random() * (map.length * 2 + 1)) - map.length;
        const r = Math.floor(Math.random() * (map.length * 2 + 1)) - map.length;
        if (map[q + map.length] && map[q + map.length][r + map.length] && map[q + map.length][r + map.length].type === 'walkable' && !units.some(unit => unit.q === q && unit.r === r)) {
            const unit = new Unit(q, r, 'dd', 'player'); // 'player' - владелец юнита
            units.push(unit);
            generatedUnits++;
        }
    }
    console.log('Units generated:', units);
    renderUnits();
}

function renderMap() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';

    // Вычисляем смещение для центровки карты
    const offsetX = gameContainer.clientWidth / 2;
    const offsetY = gameContainer.clientHeight / 2;

    map.forEach(row => {
        row.forEach(cell => {
            const hex = document.createElement('div');
            hex.classList.add('hex', cell.type);
            const { x, y } = axialToPixel(cell.q, cell.r, offsetX, offsetY);
            hex.style.transform = `translate(${x}px, ${y}px)`;
            hex.dataset.q = cell.q;
            hex.dataset.r = cell.r;
            gameContainer.appendChild(hex);
        });
    });
    console.log('Map rendered');
}

function renderUnits() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.querySelectorAll('.unit').forEach(el => el.remove());

    // Вычисляем смещение для центровки карты
    const offsetX = gameContainer.clientWidth / 2;
    const offsetY = gameContainer.clientHeight / 2;

    units.forEach(unit => {
        const unitElement = unit.render();
        const { x, y } = axialToPixel(unit.q, unit.r, offsetX, offsetY);
        unitElement.style.transform = `translate(${x}px, ${y}px)`;
        unitElement.dataset.id = unit.id;
        if (unit.selected) {
            unitElement.classList.add('selected');
        } else {
            unitElement.classList.remove('selected');
        }
        if (unit.actions === 0) {
            unitElement.classList.add('acted');
        } else {
            unitElement.classList.remove('acted');
        }
        gameContainer.appendChild(unitElement);
    });
    console.log('Units rendered');
    updateEndTurnButton(units.every(unit => unit.actions === 0));
}

export { map, generateMap, generateUnits, renderMap, renderUnits };