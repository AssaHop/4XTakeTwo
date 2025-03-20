import { selectUnit, generateUnits, Unit, performAttack } from '../mechanics/units.js';
import { pixelToCube, cubeRound } from '../world/map.js';
import { state } from '../core/state.js';
import { GameState, transitionTo, handlePostMovePhase } from '../core/gameStateMachine.js';
import { setupEndTurnButton, updateEndTurnButton } from './uiControls.js';
import { renderUnits } from './render.js';
import { highlightHexes, highlightAttackHexes }  from './render.js';
import { highlightUnitContext } from './highlightManager.js';


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

  // 👇 Attack path
  if (clickedUnit) {
    if (clickedUnit.owner !== 'player1') {
      const selected = state.selectedUnit;
      if (selected && selected.actions > 0) {
        const attackTargets = Unit.getAttackableHexes(selected);
        const validTarget = attackTargets.find(t => t.q === q && t.r === r && t.s === s);
        if (validTarget) {
          const success = performAttack(selected, clickedUnit);
          console.log(`🔫 Attack: ${success ? 'Success' : 'Failed'}`);
          if (success) {
            selected.pendingChargeAttack = false;
            state.hasActedThisTurn = true;
            updateEndTurnButton(true);
            transitionTo(GameState.UNIT_ATTACKING);
            setTimeout(() => {
              transitionTo(GameState.UNIT_SELECTED);
              highlightUnitContext(selected);
            }, 150);
          }
          return;
        }
      }
      return; // enemy click fallback
    }

    // ✅ Select friendly unit
    if (clickedUnit.actions > 0) {
      selectUnit(clickedUnit);
      transitionTo(GameState.UNIT_SELECTED);
    } else {
      console.log('⚠️ Clicked unit cannot act or has no actions left.');
    }
    return;
  }

  // 👇 Movement path
  const selected = state.selectedUnit;
  if (selected && selected.actions > 0) {
    const available = selected.getAvailableHexes();
    const inRange = available.find(h => cubeEqualsWithEpsilon(h, { q, r, s }));
    if (inRange) {
      const moved = selected.moveTo(q, r, s);
      if (moved) {
        console.log(`🚶 Unit moved to: (${q}, ${r}, ${s})`);
        renderUnits();
        transitionTo(GameState.UNIT_MOVING);
        handlePostMovePhase(selected);
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
  updateEndTurnButton();
  transitionTo(GameState.ENEMY_TURN);
  setTimeout(() => transitionTo(GameState.IDLE), 200);
}

export { setupEventListeners };
