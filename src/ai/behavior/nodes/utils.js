/**
 * Проверка: враг в радиусе атаки.
 */
export function isEnemyInRange(unit, gameState) {
  return () => {
    const enemies = unit.getVisibleEnemies();
    return enemies.some(enemy => unit.canAttack(enemy));
  };
}

/**
 * Проверка: есть ли незащищённый город рядом.
 */
export function isCapturableCityNearby(unit, gameState) {
  return () => {
    const city = getUnprotectedEnemyCity(unit, gameState);
    return Boolean(city);
  };
}