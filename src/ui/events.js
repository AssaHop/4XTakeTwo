import { resetUnitsActions, selectUnit } from '../mechanics/units.js';
import { renderUnits, renderMap, highlightHexes } from './render.js';
import { state, mapOffsetX, mapOffsetY } from '../core/game.js';
import { HEX_RADIUS, squashFactor } from '../world/map.js';

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

    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', handleCanvasClick);
}

function handleCanvasClick(event) {
    const { x, y } = getCanvasCoordinates(event);
    console.log(`Canvas clicked at: (${x}, ${y})`);
    const selectedUnit = state.selectedUnit;
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
        console.log(`Unit selected at: (${unit.q}, ${unit.r}, ${unit.s})`);
        selectUnit(unit);
    }
}

function handleUnitMovement(unit, x, y) {
    const hexCoords = pixelToHex(x, y);
    console.log(`Unit moved to: (${hexCoords.q}, ${hexCoords.r}, ${hexCoords.s})`);
    unit.moveTo(hexCoords.q, hexCoords.r, hexCoords.s);
    state.selectedUnit = null;
    state.highlightedHexes = [];
    renderMap();
    renderUnits();
}

function pixelToHex(x, y) {
    console.log(`➡️ pixelToHex called with: x = ${x}, y = ${y}`);
    
    const size = HEX_RADIUS;
    const scale = window.scale || 1;

    // Вычитаем смещение карты (центрируем расчет)
    const adjustedX = (x - mapOffsetX) / scale;
    const adjustedY = (y - mapOffsetY) / scale;

    console.log(`Adjusted coordinates: (${adjustedX}, ${adjustedY})`);

    const q = (Math.sqrt(3) / 3 * adjustedX - 1 / 3 * adjustedY) / size;
    const r = (2 / 3 * adjustedY) / (size * squashFactor);
    const s = -q - r;

    console.log(`Calculated fractional coordinates: (q: ${q}, r: ${r}, s: ${s})`);

    const roundedCube = cubeRound({ q, r, s });
    console.log(`✅ Pixel to Hex result: (q: ${roundedCube.q}, r: ${roundedCube.r}, s: ${roundedCube.s})`);

    return roundedCube;
}

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

function isUnitClicked(unit, x, y) {
    const { q, r, s } = pixelToHex(x, y);
    console.log(`Unit coordinates: (q: ${unit.q}, r: ${unit.r}, s: ${unit.s})`);
    const isClicked = unit.q === q && unit.r === r && unit.s === s;
    console.log(`Is unit clicked: (q: ${q}, r: ${r}, s: ${s}) -> ${isClicked}`);
    return isClicked;
}

function endTurn() {
    resetUnitsActions();
    state.selectedUnit = null;
    state.highlightedHexes = [];
    renderMap();
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