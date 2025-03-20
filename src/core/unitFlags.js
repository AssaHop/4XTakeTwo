// 📂 core/unitFlags.js — установка флагов поведения юнита на основе модулей (обновлённая версия)

export function setupActionFlags(unit) {
    unit.canAttackAfterMove = false;
    unit.canMoveAfterAttack = false;
    unit.canRepeatAttackOnKill = false;
    unit.hasExplosionAbility = false;
    unit.preventEnemyRetaliation = false;
    unit.disableOwnRetaliation = false;
  
    if (unit.hasModule?.('Charge')) unit.canAttackAfterMove = true;
    if (unit.hasModule?.('Flee')) unit.canMoveAfterAttack = true;
    if (unit.hasModule?.('Percy')) unit.canRepeatAttackOnKill = true;
    if (unit.hasModule?.('Blast')) unit.hasExplosionAbility = true;
    if (unit.hasModule?.('Ambush')) unit.preventEnemyRetaliation = true;
    if (unit.hasModule?.('Still')) unit.disableOwnRetaliation = true;
  }
  
  // Вызывать после applyModules(unit) → setupActionFlags(unit)
  