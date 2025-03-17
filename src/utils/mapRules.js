// 📁 src/utils/mapRules.js

export const mapRules = {
    terrainDistribution: {
      surf: { min: 30, max: 50 },
      water: { min: 20, max: 30 },
      deep: { min: 10, max: 20 },
      land: { min: 10, max: 15 },
      hill: { min: 5, max: 10 },
      mount: { min: 2, max: 5 },
      peak: { min: 0, max: 1 }
    },
    spawnRules: {
      peak: {
        condition: "mount",
        requiredNeighbors: 3
      },
      land: {
        condition: "surf,water",
        probability: 0.65
      },
      deep: {
        condition: "water",
        prohibitedNeighbors: "surf"
      }
    }
  };
  