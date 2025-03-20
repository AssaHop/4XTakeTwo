// 📂 src/ui/highlightManager.js — централизованный обработчик подсветки

import { highlightHexes, highlightAttackHexes } from './render.js';
import { Unit } from '../mechanics/units.js';
import { state } from '../core/state.js';

/**
 * Обновляет всю подсветку — движение и атаки
 */
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

/**
 * Подсвечивает только атаки — удобно при UNIT_ACTING
 */
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

/**
 * Сброс всей подсветки
 */
export function clearAllHighlights() {
  highlightHexes([]);
  highlightAttackHexes([]);
}

/**
 * ✅ Вот её надо было вернуть — универсальный вызов подсветки по юниту
 */
export function highlightUnitContext(unit) {
  console.log(`💡 [highlightUnitContext] called for ${unit?.type}, actions=${unit?.actions}`);
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
