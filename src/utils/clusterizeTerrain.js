// 📁 src/utils/clusterizeTerrain.js

import { getTile, getNeighbors } from '../world/map.js';

export function generateTerrainClusters(mapTiles, options = {}) {
  const {
    seedCount = 15,
    growIterations = 2,
    growChance = 0.3
  } = options;

  const availableTerrains = ['land', 'hill', 'mount', 'surf', 'water'];

  // Выбираем случайные точки — seedTiles
  const seeds = [];
  for (let i = 0; i < seedCount; i++) {
    const randomTile = mapTiles[Math.floor(Math.random() * mapTiles.length)];
    const type = availableTerrains[Math.floor(Math.random() * availableTerrains.length)];
    randomTile.terrainType = type;
    seeds.push({ tile: randomTile, type });
  }

  // Рост от очагов — по соседям
  for (let step = 0; step < growIterations; step++) {
    const newTiles = [];
    for (const { tile, type } of seeds) {
      const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
      for (const neighbor of neighbors) {
        if (Math.random() < growChance && neighbor.terrainType !== type) {
          neighbor.terrainType = type;
          newTiles.push({ tile: neighbor, type });
        }
      }
    }
    seeds.push(...newTiles);
  }
}

export function clusterizeTerrain(mapTiles, intensity = 0.6) {
  for (const tile of mapTiles) {
    const neighbors = tile.neighbors
      .map(n => getTile(n.q, n.r, n.s))
      .filter(Boolean);

    const sameTypeCount = neighbors.filter(n => n.terrainType === tile.terrainType).length;

    if (sameTypeCount >= 3 && Math.random() < intensity) {
      for (const neighbor of neighbors) {
        if (neighbor.terrainType !== tile.terrainType && Math.random() < 0.3) {
          neighbor.terrainType = tile.terrainType;
        }
      }
    }
  }
}
