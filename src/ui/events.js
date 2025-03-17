import { selectUnit } from '../mechanics/units.js';
import { pixelToCube, cubeRound } from '../world/map.js';
import { state } from '../core/state.js';
import { GameState, transitionTo } from '../core/gameStateMachine.js';
import { setupEndTurnButton, updateEndTurnButton } from './uiControls.js';
import { renderUnits, highlightHexes } from './render.js'; // Добавляем импорт highlightHexes

const squashFactor = 0.7; // ⚠️ Хардкодим локально, чтобы не падало на импорт

function setupEventListeners() {
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', handleCanvasClick);
    setupEndTurnButton(handleEndTurn);
    console.log('🎯 Event listeners setup initialized');
}

function cubeEqualsWithEpsilon(a, b, epsilon = 0.1) {
    return Math.abs(a.q - b.q) < epsilon &&
           Math.abs(a.r - b.r) < epsilon &&
           Math.abs(a.s - b.s) < epsilon;
}

function handleCanvasClick(event) {
    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left - state.offset.x) / state.scale;
    const y = (event.clientY - rect.top - state.offset.y) / state.scale / squashFactor;

    const clickedCube = pixelToCube(x, y);
    console.log('🧭 Raw cube from pixelToCube:', clickedCube);

    const rounded = cubeRound(clickedCube);
    console.log(`🧮 cubeRound: from (${clickedCube.q.toFixed(3)}, ${clickedCube.r.toFixed(3)}, ${clickedCube.s.toFixed(3)}) → rounded (${rounded.q}, ${rounded.r}, ${rounded.s})`);

    const { q, r, s } = rounded;
    console.log(`🎯 Final clicked cube: (${q}, ${r}, ${s})`);

    state.units.forEach(u => {
        const match = cubeEqualsWithEpsilon(u, { q, r, s });
        const dq = Math.abs(u.q - q);
        const dr = Math.abs(u.r - r);
        const ds = Math.abs(u.s - s);
        console.log(`📋 Compare to unit at (${u.q},${u.r},${u.s}) → match=${match}, dq=${dq}, dr=${dr}, ds=${ds}`);
    });

    const clickedUnit = state.units.find(unit => cubeEqualsWithEpsilon(unit, { q, r, s }));

    if (clickedUnit) {
        console.log(`✅ Unit selected at: (${clickedUnit.q}, ${clickedUnit.r}, ${clickedUnit.s})`);
        console.log("🟡 Move range hexes:");
        const moveHexes = clickedUnit.getAvailableHexes();
        moveHexes.forEach(h => {
            console.log(` - (${h.q}, ${h.r}, ${h.s})`);
        });
        selectUnit(clickedUnit);
        transitionTo(GameState.UNIT_SELECTED);
        return;
    }

    const selected = state.selectedUnit;
    if (selected && selected.actions > 0) {
        const available = selected.getAvailableHexes();
        console.log('📌 Available move hexes:', available);

        available.forEach(h => {
            const match = cubeEqualsWithEpsilon(h, { q, r, s });
            console.log(`   ➕ Compare to moveHex (${h.q},${h.r},${h.s}) → match=${match}`);
        });

        const inRange = available.find(h => cubeEqualsWithEpsilon(h, { q, r, s }));
        console.log(`📏 Clicked hex in moveRange: ${!!inRange}`);

        if (inRange) {
            const success = selected.moveTo(q, r, s);
            console.log(`📤 Attempting moveTo(${q}, ${r}, ${s}) → success=${success}`);
            console.log(`📍 Unit position after move: (${selected.q}, ${selected.r}, ${selected.s})`);

            const newAvailable = selected.getAvailableHexes();
            console.log('🔍 Recheck move range after move:');
            newAvailable.forEach(h => console.log(` - (${h.q}, ${h.r}, ${h.s})`));

            if (success) {
                console.log(`🚶 Unit moved to: (${q}, ${r}, ${s})`);
                highlightHexes([]); // Сбрасываем подсветку доступных гексов
                renderUnits(); // 🔥 <-- ПЕРЕРИСОВКА ЮНИТОВ ПОСЛЕ MOVE
                transitionTo(GameState.UNIT_MOVING);
                setTimeout(() => transitionTo(GameState.IDLE), 100);
                return;
            }
        }
    }

    console.log('❌ No unit at clicked hex or move invalid.');
}

function handleEndTurn() {
    console.log('🔚 End turn clicked');
    state.units.forEach(unit => unit.resetActions());
    state.hasActedThisTurn = false;
    updateEndTurnButton(false);
    transitionTo(GameState.ENEMY_TURN);
    setTimeout(() => transitionTo(GameState.IDLE), 200);
}

export { setupEventListeners };