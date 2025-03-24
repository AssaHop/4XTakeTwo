// 📂 src/ui/highlightManager.js

import { highlightHexes, highlightAttackHexes } from './render.js';
import { Unit } from '../mechanics/units.js';
import { state } from '../core/state.js';

export function updateHighlighting() {
  const unit = state.selectedUnit;
  if (!unit || unit.actions <= 0) {
    clearAllHighlights();
    return;
  }
  const moveHexes = unit.getAvailableHexes();
  const attackHexes = Unit.getAttackableHexes(unit);
  state.highlightedHexes = moveHexes;
  state.attackHexes = attackHexes;
  highlightHexes(moveHexes);
  highlightAttackHexes(attackHexes);
}

export function highlightOnlyAttacks() {
  const unit = state.selectedUnit;
  if (!unit || unit.actions <= 0) {
    clearAllHighlights();
    return;
  }
  const attackHexes = Unit.getAttackableHexes(unit);
  state.attackHexes = attackHexes;
  highlightAttackHexes(attackHexes);
}

export function clearAllHighlights() {
  state.highlightedHexes = [];
  state.attackHexes = [];
  highlightHexes([]);
  highlightAttackHexes([]);
}

export function clearMoveHighlights() {
  state.highlightedHexes = [];
  highlightHexes([]);
}

export function clearAttackHighlights() {
  state.attackHexes = [];
  highlightAttackHexes([]);
}

export function highlightUnitContext(unit) {
  console.log(`💡 [highlightUnitContext] called for ${unit?.type}, actions=${unit?.actions}`);

  if (!unit || unit.actions <= 0) {
    console.log('🔕 [highlightUnitContext] Unit inactive or undefined — clearing highlights');
    clearAllHighlights();
    return;
  }

  const moveHexes = unit.getAvailableHexes();
  const attackHexes = Unit.getAttackableHexes(unit);

  console.log('📍 moveHexes:', moveHexes.map(h => `(${h.q},${h.r},${h.s})`));
  console.log('📍 attackHexes:', attackHexes.map(h => `(${h.q},${h.r},${h.s})`));

  // ✅ если нет attackHexes — сбрасываем атаку
  if (!attackHexes || attackHexes.length === 0) {
    console.log('🚫 No attack targets — clearing attack highlights');
    clearAttackHighlights();
  } else {
    state.attackHexes = attackHexes;
    highlightAttackHexes(attackHexes);
  }

  // ✅ если нет moveHexes — сбрасываем мув
  if (!moveHexes || moveHexes.length === 0) {
    console.log('🚫 No move targets — clearing move highlights');
    clearMoveHighlights();
  } else {
    state.highlightedHexes = moveHexes;
    highlightHexes(moveHexes);
  }
}
