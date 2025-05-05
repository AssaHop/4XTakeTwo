/**
 * Действие: захват ближайшего незанятого города.
 */
export function captureNearbyCity(unit, gameState) {
  const targetCity = getUnprotectedEnemyCity(unit, gameState);
  if (!targetCity) return false;

  const inRange = unit.canReach(targetCity);
  if (inRange) {
    const success = unit.capture(targetCity);
    console.log(`🏰 ${unit.name} захватывает город ${targetCity.name}`);
    return success;
  }

  return false;
}

/**
 * Возвращает ближайший вражеский город без гарнизона.
 */
export function getUnprotectedEnemyCity(unit, gameState) {
  return gameState
    .getEnemyCities()
    .filter(city => !city.hasGarrison() && unit.canReach(city))
    .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
}