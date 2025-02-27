import { resetUnitsActions, units } from '../mechanics/units.js';
import { renderUnits, renderMap } from './render.js';
import { state } from '../core/state.js';

// Общие события
function setupEventListeners() {
    console.log("Event listeners setup initialized");

    document.addEventListener('DOMContentLoaded', () => {
        const endTurnButton = document.getElementById('end-turn-button');
        if (endTurnButton) {
            endTurnButton.addEventListener('click', () => {
                endTurn();
            });
        } else {
            console.error("Element with ID 'end-turn-button' not found");
        }
    });

    // События выбора и перемещения юнитов
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', handleCanvasClick);
}

function handleCanvasClick(event) {
    const { x, y } = getCanvasCoordinates(event);
    const selectedUnit = state.units.find(unit => unit.selected);
    if (selectedUnit) {
        handleUnitMovement(selectedUnit, x, y);
    } else {
        handleUnitSelection(x, y);
    }
}

function getCanvasCoordinates(event) {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function handleUnitSelection(x, y) {
    const unit = state.units.find(unit => isUnitClicked(unit, x, y));
    if (unit) {
        units.forEach(u => u.deselect()); // Снять выделение со всех юнитов
        unit.select();
        renderUnits();
    }
}

function handleUnitMovement(unit, x, y) {
    // Преобразование пиксельных координат в координаты гекса
    const hexCoords = pixelToHex(x, y);
    unit.moveTo(hexCoords.q, hexCoords.r);
    renderUnits();
}

function pixelToHex(x, y) {
    // Преобразование пиксельных координат в координаты гекса (пример реализации)
    // Ваша реализация может отличаться
    const q = Math.floor(x / 100); // Примерное преобразование
    const r = Math.floor(y / 100); // Примерное преобразование
    return { q, r };
}

function isUnitClicked(unit, x, y) {
    // Проверка, был ли юнит выбран по координатам
    const unitX = unit.q; // Преобразование координат юнита
    const unitY = unit.r;
    const { q, r } = pixelToHex(x, y);
    return unitX === q && unitY === r; // Проверка попадания по юниту
}

function endTurn() {
    units.forEach(unit => {
        unit.actions = 1;
        unit.selected = false;
        unit.checkState();
        unit.upgrade();
    });
    renderMap(state.map); // Используем state.map
    renderUnits();
    updateEndTurnButton(false);
}

function updateEndTurnButton(enabled) {
    const button = document.getElementById('end-turn-button');
    if (button) {
        button.disabled = !enabled;
    } else {
        console.error("Element with ID 'end-turn-button' not found");
    }
}

export { endTurn, updateEndTurnButton, setupEventListeners };