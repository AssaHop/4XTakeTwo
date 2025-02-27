import { resetUnitsActions, selectUnit } from '../mechanics/units.js';
import { renderUnits, renderMap, highlightHexes } from './render.js';
import { state } from '../core/state.js';
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
    const size = HEX_RADIUS;
    const q = (x * 2/3) / size;
    const r = (-x / 3 + Math.sqrt(3)/3 * y / squashFactor) / size;
    const s = -q - r;
    const roundedCube = cubeRound({ q, r, s });
    console.log(`Pixel to Hex: (${x}, ${y}) -> (${roundedCube.q}, ${roundedCube.r}, ${roundedCube.s})`);
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
    const isClicked = unit.q === q && unit.r === r && unit.s === s;
    console.log(`Is unit clicked: (${q}, ${r}, ${s}) -> ${isClicked}`);
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