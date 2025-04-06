// 📋 src/utils/terrainGen.js

import { getTile } from '../world/map.js';

/* ----------------------------------------------
   🌋 TERRAIN CLUSTER GENERATION (with seed & zones)
------------------------------------------------ */

export function generateTerrainClusters(mapTiles, options = {}) {
  const {
    seed = Date.now(),
    seedCount = 20,
    growIterations = 2,
    growChance = 0.5,
    seedZones = []
  } = options;

  const rng = createSeededRNG(seed);
  const seeds = [];
  const usedTiles = new Set();

  seedZones.forEach(zone => {
    const zoneTiles = filterZone(mapTiles, zone.zone).filter(t => !usedTiles.has(tileKey(t)));
    for (let i = 0; i < zone.count; i++) {
      if (zoneTiles.length === 0) break;
      const tile = zoneTiles[Math.floor(rng() * zoneTiles.length)];
      if (tile && !usedTiles.has(tileKey(tile))) {
        tile.terrainType = zone.type;
        usedTiles.add(tileKey(tile));
        seeds.push({ tile, type: zone.type });
      }
    }
  });

  const maxSeeds = mapTiles.length - usedTiles.size;
  const actualSeedCount = Math.min(seedCount, maxSeeds);
  const availableTerrains = ['land', 'hill', 'mount', 'surf', 'water'];

  for (let i = 0; i < actualSeedCount; i++) {
    const randomTile = mapTiles[Math.floor(rng() * mapTiles.length)];
    const type = availableTerrains[Math.floor(rng() * availableTerrains.length)];
    const key = tileKey(randomTile);
    if (randomTile && !usedTiles.has(key)) {
      randomTile.terrainType = type;
      usedTiles.add(key);
      seeds.push({ tile: randomTile, type });
    }
  }

  for (let step = 0; step < growIterations; step++) {
    const newTiles = [];
    for (const { tile, type } of seeds) {
      const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
      for (const neighbor of neighbors) {
        const key = tileKey(neighbor);
        if (!usedTiles.has(key) && rng() < growChance && neighbor.terrainType !== type) {
          neighbor.terrainType = type;
          usedTiles.add(key);
          newTiles.push({ tile: neighbor, type });
        }
      }
    }
    seeds.push(...newTiles);
  }
}

function tileKey(t) {
  return `${t.q},${t.r},${t.s}`;
}

function filterZone(mapTiles, zoneName) {
  const qMin = Math.min(...mapTiles.map(t => t.q));
  const qMax = Math.max(...mapTiles.map(t => t.q));
  const rMin = Math.min(...mapTiles.map(t => t.r));
  const rMax = Math.max(...mapTiles.map(t => t.r));
  const midQ = (qMin + qMax) / 2;
  const midR = (rMin + rMax) / 2;

  return mapTiles.filter(t => {
    const { q, r } = t;
    if (zoneName === 'top') return r <= rMin + 2;
    if (zoneName === 'bottom') return r >= rMax - 2;
    if (zoneName === 'left') return q <= qMin + 2;
    if (zoneName === 'right') return q >= qMax - 2;
    if (zoneName === 'center') return Math.abs(q - midQ) < 3 && Math.abs(r - midR) < 3;
    if (zoneName === 'topLeft') return q < midQ && r < midR;
    if (zoneName === 'topRight') return q > midQ && r < midR;
    if (zoneName === 'bottomLeft') return q < midQ && r > midR;
    if (zoneName === 'bottomRight') return q > midQ && r > midR;
    return false;
  });
}

/* ----------------------------------------------
   🎯 TERRAIN CLUSTER SMOOTHING
------------------------------------------------ */

export function clusterizeTerrain(mapTiles, intensity = 0.6, rng = Math.random) {
  for (const tile of mapTiles) {
    const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
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

/* ----------------------------------------------
   🧱 VERTICAL ISLAND GROWTH (with iterations)
------------------------------------------------ */

export function applyVerticalIslandGrowth(mapTiles, verticalGrowthRules = {}, iterations = 3) {
  for (let step = 0; step < iterations; step++) {
    for (const baseType in verticalGrowthRules) {
      const promotions = verticalGrowthRules[baseType];
      const candidates = mapTiles.filter(t => t.terrainType === baseType);
      for (const tile of candidates) {
        const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
        for (const promoteTo in promotions) {
          const rule = promotions[promoteTo];
          const countSame = neighbors.filter(n => n.terrainType === baseType).length;
          if (countSame >= rule.threshold && Math.random() < rule.chance) {
            tile.terrainType = promoteTo;
            break;
          }
        }
      }
    }
  }
}

/* ----------------------------------------------
   🏔️ HILL POLISH FILTER
------------------------------------------------ */

export function applyLandToHillFilter(mapTiles, chance = 1) {
  for (const tile of mapTiles) {
    if (tile.terrainType !== 'land') continue;

    const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);

    // ✅ Только если 6 из 6 соседей — hill
    const hillCount = neighbors.filter(n => n.terrainType === 'hill').length;
    if (hillCount === 6 && Math.random() < chance) {
      tile.terrainType = 'hill';
    }
  }
}

/* ----------------------------------------------
   🌊 DEEP POLISH FILTER
------------------------------------------------ */

export function applyWaterToDeepFilter(mapTiles, chance = 0.5) {
  for (const tile of mapTiles) {
    if (tile.terrainType !== 'water') continue;

    const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);

    const allWaterOrDeep = neighbors.every(n =>
      n.terrainType === 'water' || n.terrainType === 'deep'
    );

    const allDeepOrWaterAround = neighbors.every(n =>
      !['land', 'hill', 'mount', 'peak', 'surf'].includes(n.terrainType)
    );

    const hasMinWaterRing = neighbors.filter(n =>
      ['water', 'deep'].includes(n.terrainType)
    ).length >= 5;

    if (allWaterOrDeep && allDeepOrWaterAround && hasMinWaterRing && Math.random() < chance) {
      tile.terrainType = 'deep';
    }
  }
}


/* ----------------------------------------------
   🌊 SURF GENERATION AROUND ISLANDS
------------------------------------------------ */

export function applySurfRim(mapTiles, chance = 0.3) {
  const pendingSurf = new Set();

  for (const tile of mapTiles) {
    if (tile.terrainType !== 'water') continue;

    const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
    const hasLand = neighbors.some(n => ['land', 'hill'].includes(n.terrainType));
    const hasMount = neighbors.some(n => n.terrainType === 'mount');

    if (hasLand && !hasMount) {
      tile.terrainType = 'surf';
    } else {
      const surfCount = neighbors.filter(n => n.terrainType === 'surf').length;
      if (surfCount >= 2 && Math.random() < chance) {
        pendingSurf.add(tile);
      }
    }
  }

  pendingSurf.forEach(t => t.terrainType = 'surf');
}

/* ----------------------------------------------
   🎲 SEED RNG UTILITY
------------------------------------------------ */

export function createSeededRNG(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}
