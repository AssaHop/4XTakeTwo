import { ClassTemplates } from '../core/classTemplates.js';

/**
 * Проверяет, может ли юнит быть размещён на данном гексе
 * @param {string} unitType
 * @param {object} hex
 * @returns {boolean}
 */
export function canUnitSpawnOnHex(unitType, hex) {
  const template = ClassTemplates[unitType];
  if (!template || !hex || !hex.terrainType) return false;

  const allowed = template.spawnTerrain || ['surf', 'water', 'deep'];
  return allowed.includes(hex.terrainType);
}

/**
 * Возвращает все подходящие клетки для спауна конкретного типа юнита
 * @param {string} unitType
 * @param {Array} map
 * @returns {Array}
 */
export function getTemplateSpawnCells(unitType, map = []) {
  return map.flat().filter(cell => canUnitSpawnOnHex(unitType, cell));
}

/**
 * Выбирает случайный гекс из подходящих, исключая занятые
 * @param {Array} possibleCells
 * @param {Array} taken
 * @returns {object|null}
 */
export function getRandomFreeHex(possibleCells = [], taken = []) {
  const free = possibleCells.filter(cell =>
    !taken.some(t => t.q === cell.q && t.r === cell.r && t.s === cell.s)
  );

  if (!free.length) return null;

  return free[Math.floor(Math.random() * free.length)];
}
