// --- Conditions ---

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

// --- Actions ---

/**
 * Действие: двигаться к ближайшему врагу.
 */
export function moveToClosestEnemy(unit, gameState) {
  return () => {
    const enemies = unit.getVisibleEnemies().sort(
      (a, b) => unit.distanceTo(a) - unit.distanceTo(b)
    );

    for (const target of enemies) {
      if (unit.moveToward(target)) {
        console.log(`🧭 AI ${unit.type} начал движение к врагу ${target.type}`);
        return true;
      }
    }

    console.warn(`🧍 AI ${unit.type} не смог найти путь к врагу`);
    return false;
  };
}

/**
 * Действие: захват ближайшего незанятого города.
 */
export function captureNearbyCity(unit, gameState) {
  return () => {
    const city = getUnprotectedEnemyCity(unit, gameState);
    if (city && unit.canReach(city)) {
      return unit.moveToward(city);
    }
    return false;
  };
}

// --- Pure utils (используются внутри conditions/actions) ---

/**
 * Вернёт ближайшего врага, которого можно атаковать.
 */
export function getClosestAttackableEnemy(unit, gameState) {
  const enemies = unit.getVisibleEnemies();
  return enemies
    .filter(enemy => unit.canAttack(enemy))
    .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
}

/**
 * Вернёт ближайший вражеский город без гарнизона.
 */
export function getUnprotectedEnemyCity(unit, gameState) {
  return gameState
    .getEnemyCities()
    .filter(city => !city.hasGarrison() && unit.canReach(city))
    .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
}
