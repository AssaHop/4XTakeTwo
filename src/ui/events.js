import { units } from '../mechanics/units.js';
import { renderMap, renderUnits } from '../ui/render.js';
import { map } from '../core/game.js';

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

    // Другие обработчики событий
}

function endTurn() {
    units.forEach(unit => {
        unit.actions = 1;
        unit.selected = false;
        unit.checkState();
        unit.upgrade();
    });
    renderMap(map);
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