import { getTile } from '../world/map.js';

/**
 * Генерирует кластеры террейна с использованием seed-псевдослучайности
 */
export function generateTerrainClusters(mapTiles, options = {}) {
  const {
    seedCount = 49,
    growIterations = 1,
    growChance = 0.5,
    seed = Date.now()
  } = options;

  const rng = createSeededRNG(seed);
  const availableTerrains = ['land', 'hill', 'mount', 'surf', 'water'];

  const seeds = [];
  for (let i = 0; i < seedCount; i++) {
    const randomTile = mapTiles[Math.floor(rng() * mapTiles.length)];
    const type = availableTerrains[Math.floor(rng() * availableTerrains.length)];
    randomTile.terrainType = type;
    seeds.push({ tile: randomTile, type });
  }

  for (let step = 0; step < growIterations; step++) {
    const newTiles = [];
    for (const { tile, type } of seeds) {
      const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
      for (const neighbor of neighbors) {
        if (rng() < growChance && neighbor.terrainType !== type) {
          neighbor.terrainType = type;
          newTiles.push({ tile: neighbor, type });
        }
      }
    }
    seeds.push(...newTiles);
  }
}

/**
 * Делает террейн более естественным — сглаживание по соседям
 */
export function clusterizeTerrain(mapTiles, intensity = 0.6, rng = Math.random) {
  for (const tile of mapTiles) {
    const neighbors = tile.neighbors
      .map(n => getTile(n.q, n.r, n.s))
      .filter(Boolean);

    const sameTypeCount = neighbors.filter(n => n.terrainType === tile.terrainType).length;

    if (sameTypeCount >= 3 && rng() < intensity) {
      for (const neighbor of neighbors) {
        if (neighbor.terrainType !== tile.terrainType && rng() < 0.3) {
          neighbor.terrainType = tile.terrainType;
        }
      }
    }
  }
}

/**
 * Утилита: генератор псевдослучайных чисел по сид-значению
 */
function createSeededRNG(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}
