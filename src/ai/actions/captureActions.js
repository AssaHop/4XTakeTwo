// 📁 src/ai/actions/captureActions.js

import { getUnprotectedEnemyCity } from '../behavior/nodes/utils.js';

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
