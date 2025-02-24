import { map, axialToPixel } from '../world/map.js';
import { units } from '../core/game.js';
import { updateEndTurnButton } from './events.js';

function renderMap() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';

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

export { renderMap, renderUnits };