// 📂 src/ui/events.js

import { selectUnit, generateUnits, Unit, performAttack } from '../mechanics/units.js';
import { pixelToCube, cubeRound } from '../world/map.js';
import { state } from '../core/state.js';
import { GameState, transitionTo } from '../core/gameStateMachine.js';
import { setupEndTurnButton, updateEndTurnButton } from './uiControls.js';
import { renderUnits, highlightHexes } from './render.js';

const squashFactor = 0.7;

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
  const rounded = cubeRound(clickedCube);
  const { q, r, s } = rounded;

  const clickedUnit = state.units.find(unit => cubeEqualsWithEpsilon(unit, { q, r, s }));

  if (clickedUnit) {
    if (clickedUnit.owner !== 'player1') {
      const selected = state.selectedUnit;
      if (selected && selected.actions > 0) {
        const targets = Unit.getAttackableHexes(selected); // Вызов статического метода через класс Unit
        const targetHex = targets.find(t => t.q === q && t.r === r && t.s === s);
        if (targetHex) {
          const success = performAttack(selected, clickedUnit);
          console.log(`🔫 Attack: ${success ? 'Success' : 'Failed'}`);
          if (success) {
            state.hasActedThisTurn = true;
            updateEndTurnButton(true);
            transitionTo(GameState.UNIT_ATTACKING);
            setTimeout(() => transitionTo(GameState.IDLE), 100);
          }
          return;
        }
      }
      console.warn('⚠️ Clicked unit cannot act or is enemy. Ignoring.');
      return;
    }
    console.log(`✅ Unit selected at: (${clickedUnit.q}, ${clickedUnit.r}, ${clickedUnit.s})`);
    selectUnit(clickedUnit);
    transitionTo(GameState.UNIT_SELECTED);
    return;
  }

  const selected = state.selectedUnit;
  if (selected && selected.actions > 0) {
    const available = selected.getAvailableHexes();
    const inRange = available.find(h => cubeEqualsWithEpsilon(h, { q, r, s }));
    if (inRange) {
      const success = selected.moveTo(q, r, s);
      if (success) {
        console.log(`🚶 Unit moved to: (${q}, ${r}, ${s})`);
        highlightHexes([]);
        renderUnits();
        transitionTo(GameState.UNIT_MOVING);
        setTimeout(() => transitionTo(GameState.IDLE), 100);
        return;
      }
    }
  }
  console.log('❌ Clicked hex: No valid action.');
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