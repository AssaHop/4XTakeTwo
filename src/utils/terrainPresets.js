// 📁 src/utils/terrain/terrainPresets.js

export const terrainPresets = {
    default: {
      profileName: "Default Island",
      terrainDistribution: {
        surf: { min: 30, max: 50 },
        water: { min: 20, max: 30 },
        deep: { min: 10, max: 20 },
        land: { min: 10, max: 15 },
        hill: { min: 5, max: 10 },
        mount: { min: 2, max: 5 },
        peak: { min: 0, max: 2 }
      },
      spawnRules: {
        surf: { condition: "land,hill", requiredNeighbors: 1, probability: 0.6, prohibitedNeighbors: "peak" },
        land: { condition: "land,hill", requiredNeighbors: 2, probability: 0.8 },
        hill: { condition: "land,hill", requiredNeighbors: 2, probability: 0.6 },
        mount: { condition: "hill,mount", requiredNeighbors: 2, probability: 0.5 },
        peak: { condition: "mount", requiredNeighbors: 3 },
        deep: { condition: "water", prohibitedNeighbors: "surf" },
        water: { condition: "surf,land", probability: 0.7 }
      },
      clusterConfig: {
        baseTypes: ["land", "hill"],
        growthChance: 0.3,
        maxClusters: 10,
        maxClusterSize: 10
      }
    },
  
    archipelago: {
      profileName: "Small Archipelago",
      terrainDistribution: {
        surf: { min: 60, max: 80 },
        water: { min: 30, max: 50 },
        deep: { min: 20, max: 30 },
        land: { min: 5, max: 10 },
        hill: { min: 3, max: 5 },
        mount: { min: 1, max: 3 },
        peak: { min: 0, max: 1 }
      },
      spawnRules: {
        surf: { condition: "land,hill", requiredNeighbors: 1, probability: 0.4 },
        land: { condition: "land,hill", requiredNeighbors: 2, probability: 0.7 },
        hill: { condition: "land,hill", requiredNeighbors: 2, probability: 0.5 },
        mount: { condition: "hill,mount", requiredNeighbors: 2, probability: 0.4 },
        peak: { condition: "mount", requiredNeighbors: 3 },
        deep: { condition: "water", prohibitedNeighbors: "surf" },
        water: { condition: "surf,land", probability: 0.6 }
      },
      clusterConfig: {
        baseTypes: ["land", "hill"],
        growthChance: 0.2,
        maxClusters: 6,
        maxClusterSize: 6
      }
    }
  };
  