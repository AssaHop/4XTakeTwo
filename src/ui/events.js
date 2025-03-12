// 📂 ui/events.js — обработчики событий (FSM-расширенная версия)

import { resetUnitsActions, selectUnit } from '../mechanics/units.js';
import { renderUnits, renderMap, highlightHexes } from './render.js';
import { state } from '../core/state.js';
import { HEX_RADIUS, squashFactor } from '../world/map.js';
import { performAttack, canAttack } from '../mechanics/combat.js';
import { GameState, getState, transitionTo, is } from '../core/gameStateMachine.js';

function setupEventListeners() {
    console.log("🎯 Event listeners setup initialized");

    const endTurnButton = document.getElementById('end-turn-button');
    if (endTurnButton) {
        endTurnButton.addEventListener('click', () => {
            endTurn();
        });
    } else {
        console.error("❌ Element with ID 'end-turn-button' not found");
    }

    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', handleCanvasClick);
}

function handleCanvasClick(event) {
    const { x, y } = getCanvasCoordinates(event);
    const clickedHex = pixelToHex(x, y);
    console.log(`🖱️ Canvas clicked at: (${x}, ${y}) → cube(${clickedHex.q},${clickedHex.r},${clickedHex.s})`);

    const clickedUnit = state.units.find(u => u.q === clickedHex.q && u.r === clickedHex.r && u.s === clickedHex.s);
    const selectedUnit = state.selectedUnit;

    if (is(GameState.ENEMY_TURN)) return;

    if (selectedUnit && clickedUnit && clickedUnit.owner !== selectedUnit.owner) {
        if (canAttack(selectedUnit, clickedUnit)) {
            transitionTo(GameState.UNIT_ATTACKING);
            performAttack(selectedUnit, clickedUnit);
            resetSelection();
            transitionTo(GameState.IDLE);
            renderMap(state.scale, state.offset);
            renderUnits(state.scale, state.offset);
            return;
        } else {
            console.log("❌ Attack not allowed.");
            return;
        }
    }

    if (clickedUnit && clickedUnit.owner === 'player1' && clickedUnit.actions > 0) {
        console.log(`✅ Unit selected at: (${clickedUnit.q}, ${clickedUnit.r}, ${clickedUnit.s})`);
        transitionTo(GameState.UNIT_SELECTED);
        selectUnit(clickedUnit);
        return;
    }

    if (selectedUnit && !clickedUnit) {
        const moved = selectedUnit.moveTo(clickedHex.q, clickedHex.r, clickedHex.s);
        if (moved) {
            if (selectedUnit.actions <= 0) resetSelection();
            transitionTo(GameState.UNIT_MOVING);
            transitionTo(GameState.IDLE);
            renderMap(state.scale, state.offset);
            renderUnits(state.scale, state.offset);
        }
    }
}

function resetSelection() {
    if (state.selectedUnit) {
        state.selectedUnit.deselect?.();
    }
    state.selectedUnit = null;
    state.highlightedHexes = [];
}

function getCanvasCoordinates(event) {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function pixelToHex(x, y) {
    const size = HEX_RADIUS;
    const scale = state.scale ?? 1;
    const offsetX = state.offset?.x ?? 0;
    const offsetY = state.offset?.y ?? 0;

    const adjustedX = (x - offsetX) / scale;
    const adjustedY = (y - offsetY) / scale;

    const q = (Math.sqrt(3) / 3 * adjustedX - 1 / 3 * adjustedY) / size;
    const r = (2 / 3 * adjustedY) / (size * squashFactor);
    const s = -q - r;

    return cubeRound({ q, r, s });
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

function endTurn() {
    transitionTo(GameState.ENEMY_TURN);
    resetUnitsActions();
    resetSelection();
    renderMap(state.scale, state.offset);
    renderUnits(state.scale, state.offset);
    updateEndTurnButton(false);
    transitionTo(GameState.IDLE);
}

function updateEndTurnButton(enabled) {
    const button = document.getElementById('end-turn-button');
    if (button) {
        button.disabled = !enabled;
        console.log(`🔘 End turn button ${enabled ? 'enabled' : 'disabled'}`);
    } else {
        console.error("❌ Element with ID 'end-turn-button' not found");
    }
}

export { setupEventListeners, updateEndTurnButton, endTurn };
