// 📂 events.js — обработчики событий

import { resetUnitsActions, selectUnit } from '../mechanics/units.js';
import { renderUnits, renderMap, highlightHexes } from './render.js';
import { state } from '../core/state.js';
import { HEX_RADIUS, squashFactor } from '../world/map.js';

function setupEventListeners() {
    console.log("🎯 Event listeners setup initialized");

    // 🟥 Кнопка конца хода
    document.addEventListener('DOMContentLoaded', () => {
        const endTurnButton = document.getElementById('end-turn-button');
        if (endTurnButton) {
            endTurnButton.addEventListener('click', () => {
                endTurn();
            });
        } else {
            console.error("❌ Element with ID 'end-turn-button' not found");
        }
    });

    // 🎯 Обработка клика по canvas
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', handleCanvasClick);
}

// 📌 Обработка клика по canvas
function handleCanvasClick(event) {
    const { x, y } = getCanvasCoordinates(event);
    console.log(`🖱️ Canvas clicked at: (${x}, ${y})`);

    const selectedUnit = state.selectedUnit;

    if (selectedUnit) {
        handleUnitMovement(selectedUnit, x, y);
    } else {
        handleUnitSelection(x, y);
    }
}

// 📌 Перевод client → canvas-координат
function getCanvasCoordinates(event) {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

// 📌 Логика выбора юнита
function handleUnitSelection(x, y) {
    const unit = state.units.find(unit => isUnitClicked(unit, x, y));
    if (unit) {
        console.log(`✅ Unit selected at: (${unit.q}, ${unit.r}, ${unit.s})`);
        selectUnit(unit);
    }
}

// 📌 Логика перемещения юнита
function handleUnitMovement(unit, x, y) {
    const hexCoords = pixelToHex(x, y);
    console.log(`➡️ Unit moved to: (${hexCoords.q}, ${hexCoords.r}, ${hexCoords.s})`);

    unit.moveTo(hexCoords.q, hexCoords.r, hexCoords.s);
    state.selectedUnit = null;
    state.highlightedHexes = [];

    renderMap(state.scale, state.offset);
    renderUnits(state.scale, state.offset);
}

// 📌 Преобразование pixel → cube-координат
function pixelToHex(x, y) {
    console.log(`🧮 pixelToHex called with: x = ${x}, y = ${y}`);

    const size = HEX_RADIUS;
    const scale = state.scale ?? 1;
    const offsetX = state.offset?.x ?? 0;
    const offsetY = state.offset?.y ?? 0;

    const adjustedX = (x - offsetX) / scale;
    const adjustedY = (y - offsetY) / scale;

    console.log(`📐 Adjusted coordinates: (${adjustedX}, ${adjustedY})`);

    const q = (Math.sqrt(3) / 3 * adjustedX - 1 / 3 * adjustedY) / size;
    const r = (2 / 3 * adjustedY) / (size * squashFactor);
    const s = -q - r;

    console.log(`📐 Calculated fractional coordinates: (q: ${q}, r: ${r}, s: ${s})`);

    const roundedCube = cubeRound({ q, r, s });
    console.log(`✅ Pixel to Hex result: (q: ${roundedCube.q}, r: ${roundedCube.r}, s: ${roundedCube.s})`);

    return roundedCube;
}

// 📌 Округление cube-координат
function cubeRound(cube) {
    let q = Math.round(cube.q);
    let r = Math.round(cube.r);
    let s = Math.round(cube.s);

    const q_diff = Math.abs(q - cube.q);
    const r_diff = Math.abs(r - cube.r);
    const s_diff = Math.abs(s - cube.s);

    if (q_diff > r_diff && q_diff > s_diff) {
        q = -r - s;
    } else if (r_diff > s_diff) {
        r = -q - s;
    } else {
        s = -q - r;
    }

    return { q, r, s };
}

// 📌 Проверка попадания по юниту
function isUnitClicked(unit, x, y) {
    const { q, r, s } = pixelToHex(x, y);
    const isClicked = unit.q === q && unit.r === r && unit.s === s;
    console.log(`📍 Is unit clicked: (target qrs: ${q},${r},${s}) → ${isClicked}`);
    return isClicked;
}

// 📌 Завершение хода
function endTurn() {
    resetUnitsActions();
    state.selectedUnit = null;
    state.highlightedHexes = [];
    renderMap(state.scale, state.offset);
    renderUnits(state.scale, state.offset);
    updateEndTurnButton(false);
}

// 📌 Управление кнопкой конца хода
function updateEndTurnButton(enabled) {
    const button = document.getElementById('end-turn-button');
    if (button) {
        button.disabled = !enabled;
    } else {
        console.error("❌ Element with ID 'end-turn-button' not found");
    }
}

export { endTurn, updateEndTurnButton, setupEventListeners };
