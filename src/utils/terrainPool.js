// 📁 src/utils/terrainPool.js

export function createTerrainPool(totalHexes, terrainDistribution) {
    const pool = [];
  
    Object.entries(terrainDistribution).forEach(([terrain, range]) => {
      const min = Math.floor((range.min / 100) * totalHexes);
      const max = Math.floor((range.max / 100) * totalHexes);
      const count = getRandomInt(min, max);
  
      for (let i = 0; i < count; i++) {
        pool.push(terrain);
      }
    });
  
    // Добиваем до полной длины если не хватило
    while (pool.length < totalHexes) {
      pool.push('surf');
    }
  
    return pool;
  }
  
  export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  