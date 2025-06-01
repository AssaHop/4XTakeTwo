// src/ai/evaluators/threatEvaluator.js
export class ThreatEvaluator {
  constructor() {
    this.threatThreshold = 2.0; // Configurable
  }
  
  isThreatened(gameState) {
    const aiCities = gameState.cities.filter(c => c.owner?.startsWith('enemy'));
    const playerUnits = gameState.units.filter(u => !u.owner?.startsWith('enemy'));
    
    // Check if any cities are under threat
    for (const city of aiCities) {
      const nearbyEnemies = playerUnits.filter(u => 
        this.getDistance(city, u) <= u.moRange + 1
      );
      
      if (nearbyEnemies.length > 0) {
        return true;
      }
    }
    
    return false;
  }
  
  evaluateThreatLevel(unit, gameState) {
    const playerUnits = gameState.units.filter(u => !u.owner?.startsWith('enemy'));
    let threatLevel = 0;
    
    // Count nearby enemy units
    for (const enemy of playerUnits) {
      const distance = this.getDistance(unit, enemy);
      
      // Closer enemies are more threatening
      if (distance <= enemy.atRange) {
        threatLevel += 1.0;
      } else if (distance <= enemy.moRange + enemy.atRange) {
        threatLevel += 0.5;
      }
    }
    
    return threatLevel;
  }
  
  getDistance(a, b) {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs(a.s - b.s)
    );
  }
}