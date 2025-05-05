/**
 * Функция атаки ближайшего врага в радиусе.
 */
export function attackEnemyInRange(unit, gameState) {
  const enemies = gameState.getVisibleEnemies(unit);
  const target = enemies
    .filter(enemy => unit.canAttack(enemy))
    .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];

  if (!target) {
    console.log('⚠️ No enemy in range to attack');
    return false;
  }

  console.log(`⚔️ [AI] ${unit.type} атакует ${target.type}`);
  target.hp -= unit.atDamage || 1;
  unit.canAct = false;

  // Простая логика убийства
  if (target.hp <= 0) {
    const index = gameState.units.indexOf(target);
    if (index !== -1) gameState.units.splice(index, 1);
    console.log(`💀 ${target.type} уничтожен AI`);
  }

  return true;
}

/**
 * Возвращает ближайшего врага, которого можно атаковать.
 */
export function getClosestAttackableEnemy(unit, gameState) {
  const enemies = unit.getVisibleEnemies();
  return enemies
    .filter(enemy => unit.canAttack(enemy))
    .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
}