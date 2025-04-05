// 📁 src/utils/terrainGen.js

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

  // 1️⃣ Зональные сиды (в приоритете)
  seedZones.forEach(zone => {
    const zoneTiles = filterZone(mapTiles, zone.zone).filter(t => !usedTiles.has(tileKey(t)));
    for (let i = 0; i < zone.count; i++) {
      if (zoneTiles.length === 0) {
        console.warn(`⚠️ No tiles found for zone "${zone.zone}"`);
        break;
      }
      const tile = zoneTiles[Math.floor(rng() * zoneTiles.length)];
      if (tile && !usedTiles.has(tileKey(tile))) {
        tile.terrainType = zone.type;
        usedTiles.add(tileKey(tile));
        seeds.push({ tile, type: zone.type });
        console.log(`[Zone "${zone.zone}"] Found ${zoneTiles.length} tiles`);
      }
    }
  });

  // 2️⃣ Случайные сиды (если нужны)
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

  // 3️⃣ Рост от seed-тайлов
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
  console.log(`📐 Zone "${zoneName}" includes ${filtered.length} tiles`);
  return filtered;  
}

/* ----------------------------------------------
   🎯 TERRAIN CLUSTER SMOOTHING
------------------------------------------------ */

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

/* ----------------------------------------------
   🧠 TERRAIN SPAWN VALIDATION
------------------------------------------------ */

export function applySpawnRules(tile, mapTiles, rules) {
  const rule = rules.spawnRules[tile.terrainType];
  if (!rule) return;

  const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
  let conditionMet = true;

  if (rule.condition) {
    const conditions = rule.condition.split(',');
    const matched = neighbors.filter(n => conditions.includes(n.terrainType));
    if (rule.requiredNeighbors && matched.length < rule.requiredNeighbors) conditionMet = false;
    else if (!rule.requiredNeighbors && matched.length === 0) conditionMet = false;
  }

  if (rule.prohibitedNeighbors) {
    const prohibited = rule.prohibitedNeighbors.split(',');
    const conflict = neighbors.some(n => prohibited.includes(n.terrainType));
    if (conflict) conditionMet = false;
  }

  if (rule.probability !== undefined && Math.random() > rule.probability) {
    conditionMet = false;
  }

  if (!conditionMet) {
    tile.terrainType = rule.fallback || 'water';
  }
}

/* ----------------------------------------------
   🏝️ LAYERED ISLANDS
------------------------------------------------ */

export function applyLayeredIslandRules(mapTiles, customLayers = null) {
  const waterTiles = mapTiles.filter(t => t.terrainType === 'water');
  const clusters = clusterizeWater(waterTiles);

  for (const cluster of clusters) {
    if (cluster.length < 6) continue;

    const center = getClusterCenter(cluster);
    const type = classifyIsland(cluster.length);
    const layers = customLayers?.[type] || getDefaultLayers(type);

    applyLayers(center, layers);
  }
}

function classifyIsland(size) {
  if (size < 10) return 'micro';
  if (size < 20) return 'small';
  if (size < 35) return 'medium';
  return 'large';
}

function getDefaultLayers(type) {
  return {
    micro: ['land', 'surf'],
    small: ['hill', 'land', 'surf'],
    medium: ['mount', 'hill', 'land', 'surf'],
    large: ['peak', 'mount', 'hill', 'land', 'surf']
  }[type] || ['land'];
}

function applyLayers(centerTile, layerTypes) {
  const rings = getRings(centerTile, layerTypes.length);

  // 💥 Центр всегда получает самый высокий тип
  centerTile.terrainType = layerTypes[0];

  for (let i = 0; i < layerTypes.length; i++) {
    const tiles = rings[i];
    if (tiles) {
      for (const tile of tiles) {
        tile.terrainType = layerTypes[i];
      }
    }
  }

  if (layerTypes.length >= 4) {
    const outer = getOuterRing(rings[rings.length - 1]);
    for (const tile of outer) {
      tile.terrainType = 'surf';
    }
  }
}

function getRings(centerTile, depth) {
  const rings = [];
  let currentRing = [centerTile];
  const visited = new Set([tileKey(centerTile)]);

  for (let i = 0; i < depth; i++) {
    const nextRing = [];

    for (const tile of currentRing) {
      const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
      for (const neighbor of neighbors) {
        const key = tileKey(neighbor);
        if (!visited.has(key)) {
          visited.add(key);
          nextRing.push(neighbor);
        }
      }
    }

    rings.push(nextRing);
    currentRing = nextRing;
  }

  return rings;
}

function getOuterRing(tiles) {
  const outer = new Set();
  for (const tile of tiles) {
    const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
    for (const n of neighbors) outer.add(n);
  }
  return [...outer];
}

function getClusterCenter(cluster) {
  const avg = cluster.reduce((acc, t) => {
    acc.q += t.q; acc.r += t.r; acc.s += t.s;
    return acc;
  }, { q: 0, r: 0, s: 0 });

  const center = {
    q: Math.round(avg.q / cluster.length),
    r: Math.round(avg.r / cluster.length),
    s: Math.round(avg.s / cluster.length)
  };

  return getTile(center.q, center.r, center.s) || cluster[0];
}

function clusterizeWater(tiles) {
  const visited = new Set();
  const clusters = [];

  for (const tile of tiles) {
    const key = tileKey(tile);
    if (visited.has(key)) continue;

    const cluster = [];
    const stack = [tile];

    while (stack.length > 0) {
      const current = stack.pop();
      const k = tileKey(current);
      if (visited.has(k)) continue;

      visited.add(k);
      cluster.push(current);

      const neighbors = current.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(n =>
        n?.terrainType === current.terrainType &&
        !visited.has(tileKey(n))
      );

      stack.push(...neighbors);
    }

    clusters.push(cluster);
  }

  return clusters;
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

/* ----------------------------------------------
   🪡 TERRAIN POOL
------------------------------------------------ */

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
