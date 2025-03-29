import { highlightHexes, highlightAttackHexes } from './render.js';
import { Unit } from '../mechanics/units.js';
import { state } from '../core/state.js';

export function updateHighlighting() {
  const unit = state.selectedUnit;
  highlightUnitContext(unit);
}

export function highlightUnitContext(unit) {
  if (!unit) {
    clearAllHighlights();
    return;
  }

  const canHighlightMoves = unit.canMove;
  const canHighlightAttacks =
    unit.canAct ||
    (unit.canRepeatAttackOnKill && unit.lastAttackWasKill);

  const moveHexes = canHighlightMoves ? unit.getAvailableHexes() : [];
  const attackHexes = canHighlightAttacks ? Unit.getAttackableHexes(unit) : [];

  console.log(`💡 [highlightUnitContext] ${unit.type} move=${unit.canMove} act=${unit.canAct} lastKill=${unit.lastAttackWasKill}`);
  console.log('📍 moveHexes:', moveHexes.map(h => `(${h.q},${h.r},${h.s})`));
  console.log('📍 attackHexes:', attackHexes.map(h => `(${h.q},${h.r},${h.s})`));

  state.highlightedHexes = moveHexes;
  state.attackHexes = attackHexes;

  highlightHexes(moveHexes);
  highlightAttackHexes(attackHexes);
}

export function highlightOnlyAttacks(unit = state.selectedUnit) {
  if (!unit) {
    clearAllHighlights();
    return;
  }

  const attackHexes = Unit.getAttackableHexes(unit);
  state.highlightHexes = [];
  state.attackHexes = attackHexes;

  highlightHexes([]);
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
