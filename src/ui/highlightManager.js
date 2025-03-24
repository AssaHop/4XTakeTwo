// ✅ highlightManager.js (улучшенная версия — скрытие moveHexes при moveUsed)

import { highlightHexes, highlightAttackHexes } from './render.js';
import { Unit } from '../mechanics/units.js';
import { state } from '../core/state.js';

export function updateHighlighting() {
  const unit = state.selectedUnit;
  if (!unit || unit.actions <= 0) {
    clearAllHighlights();
    return;
  }
  const moveHexes = unit.moveUsed ? [] : unit.getAvailableHexes();
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

  const moveHexes = unit.moveUsed ? [] : unit.getAvailableHexes();
  const attackHexes = Unit.getAttackableHexes(unit);

  console.log('📍 moveHexes:', moveHexes.map(h => `(${h.q},${h.r},${h.s})`));
  console.log('📍 attackHexes:', attackHexes.map(h => `(${h.q},${h.r},${h.s})`));

  state.highlightedHexes = moveHexes;
  state.attackHexes = attackHexes;

  highlightHexes(moveHexes);
  highlightAttackHexes(attackHexes);
}