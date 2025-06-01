// src/ai/evaluators/unitEvaluator.js
export class UnitEvaluator {
  evaluateAttackAction(unit, target, gameState) {
    let score = 0;
    
    // Basic combat effectiveness
    const attackPower = unit.atDamage || 1;
    const targetDefense = target.defense || 1;
    const targetHP = target.hp;
    
    // Higher score if we can defeat the target
    if (attackPower > targetHP) {
      score += 100;
    }
    
    // Higher score if the target is valuable
    if (target.type.includes('BB')) {  // Big battleship
      score += 50;
    }
    
    // Lower score if retaliation is likely to defeat us
    if (target.canAttack(unit) && target.atDamage > unit.hp) {
      score -= 75;
    }
    
    return score;
  }
  
  // ... other evaluation methods
}