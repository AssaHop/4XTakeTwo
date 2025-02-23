import { units } from './main.js';
import { renderMap, renderUnits, map } from './map.js';
import { AttackAction, CaptureAction, HealAction } from './units.js';

function setupEventListeners() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.addEventListener('click', handleCellClick);
}

function handleCellClick(event) {
    const target = event.target;
    if (target.classList.contains('unit')) {
        selectUnit(target);
    } else if (target.classList.contains('hex')) {
        moveSelectedUnit(target);
    }
}

function selectUnit(unitElement) {
    const unitId = parseInt(unitElement.dataset.id);
    const unit = units.find(u => u.id === unitId);
    if (unit && unit.actions > 0) {
        units.forEach(u => u.selected = false);
        unit.selected = true;
        highlightCells(unit);
        renderUnits(); // Перерисовать юниты для обновления выделения
    }
}

function moveSelectedUnit(cellElement) {
    const selectedUnit = units.find(u => u.selected);
    if (selectedUnit && selectedUnit.actions > 0) {
        const newRow = parseInt(cellElement.dataset.row);
        const newCol = parseInt(cellElement.dataset.col);
        const targetCell = map[newRow][newCol];

        // Проверка на контекстное действие
        if (targetCell.type === 'enemy') {
            const attackAction = new AttackAction();
            attackAction.execute(selectedUnit, targetCell);
        } else if (targetCell.type === 'object' && targetCell.owner !== selectedUnit.owner) {
            const captureAction = new CaptureAction();
            captureAction.execute(selectedUnit, targetCell);
        } else if (targetCell.type === 'walkable') {
            selectedUnit.move(newRow, newCol);
        }

        selectedUnit.actions -= 1; // Уменьшить количество действий
        renderMap(); // Перерисовать карту для снятия подсветки
        renderUnits(); // Перерисовать юниты
    }
}

function highlightCells(unit) {
    document.querySelectorAll('.hex').forEach(hex => hex.classList.remove('highlight')); // Снять подсветку с предыдущих гексов

    const evenRowDirections = [
        { dx: -1, dy: 0 }, // Влево
        { dx: 1, dy: 0 },  // Вправо
        { dx: 0, dy: -1 }, // Вверх
        { dx: 0, dy: 1 },  // Вниз
        { dx: -1, dy: -1 }, // Диагональ вверх влево
        { dx: -1, dy: 1 }   // Диагональ вниз влево
    ];

    const oddRowDirections = [
        { dx: -1, dy: 0 }, // Влево
        { dx: 1, dy: 0 },  // Вправо
        { dx: 0, dy: -1 }, // Вверх
        { dx: 0, dy: 1 },  // Вниз
        { dx: 1, dy: -1 }, // Диагональ вверх вправо
        { dx: 1, dy: 1 }   // Диагональ вниз вправо
    ];

    const directions = unit.row % 2 === 0 ? evenRowDirections : oddRowDirections;

    directions.forEach(dir => {
        const newRow = unit.row + dir.dy;
        const newCol = unit.col + dir.dx;
        if (isWithinBounds(newRow, newCol) && map[newRow][newCol].type === 'walkable') {
            const cellElement = document.querySelector(`.hex[data-row='${newRow}'][data-col='${newCol}']`);
            if (cellElement) {
                cellElement.classList.add('highlight');
            }
        }
    });
}

function isWithinBounds(row, col) {
    return row >= 0 && row < map.length && col >= 0 && col < map[0].length;
}

export { setupEventListeners };