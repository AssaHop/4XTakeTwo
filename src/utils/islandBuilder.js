import { getTile } from '../world/map.js';

// 🌍 Генерация островов по зонам и шаблонам
export function generateZonalIslands(mapTiles, zones, shapePresets, options = {}) {
  const {
    seed = Date.now(),
    growChance = 0.5,
    growIterations = 3,
    mapSize
  } = options;

  const rng = createSeededRNG(seed);
  const usedTiles = new Set();

  for (const zone of zones) {
    const zoneTiles = filterZone(mapTiles, zone.name, mapSize);
    if (!zoneTiles.length) {
      console.warn(`⚠️ No tiles found for zone: ${zone.name}`);
      continue;
    }

    const count = zone.count || 1;

    for (let i = 0; i < count; i++) {
      const origin = zoneTiles[Math.floor(rng() * zoneTiles.length)];
      const shape = rollShape(zone.shapes, rng);
      if (!shape || !shape.name) {
        console.warn(`❗ No shape rolled for zone "${zone.name}"`);
        continue;
      }

      const deltas = shapePresets[shape.name];
      if (!deltas) {
        console.warn(`❗ Shape not found in presets: ${shape.name}`);
        continue;
      }

      const seeds = [];

      for (const delta of deltas) {
        const q = origin.q + delta.q;
        const r = origin.r + delta.r;
        const s = -q - r;
        const key = `${q},${r},${s}`;

        if (usedTiles.has(key)) continue;

        const tile = getTile(q, r, s);
        if (tile) {
          if (!mapTiles.includes(tile)) {
            console.warn('‼️ This tile is not part of the mapTiles array!', tile);
          }

          tile.terrainType = shape.type || 'land';
          usedTiles.add(key);
          seeds.push(tile);
          console.log(`🌱 [${zone.name}] Seeded ${tile.terrainType} at (${q}, ${r}, ${s}) via shape: ${shape.name}`);
        }
      }

      // 🌀 Рост по шагам
      for (let step = 1; step <= growIterations; step++) {
        const newTiles = [];

        for (const tile of seeds) {
          const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
          for (const neighbor of neighbors) {
            const key = `${neighbor.q},${neighbor.r},${neighbor.s}`;
            if (!usedTiles.has(key) && rng() < growChance) {
              neighbor.terrainType = shape.type || 'land';
              usedTiles.add(key);
              newTiles.push(neighbor);
            }
          }
        }

        seeds.push(...newTiles);
        console.log(`🌿 [${zone.name}] Step ${step}: expanded ${newTiles.length} tiles`);
      }
    }
  }
}

// 🎲 Выбор шаблона шейпа
function rollShape(shapes, rng) {
  if (!Array.isArray(shapes) || shapes.length === 0) return null;

  const totalWeight = shapes.reduce((sum, s) => sum + (s.chance || 1), 0);
  const roll = rng() * totalWeight;
  let acc = 0;
  for (const shape of shapes) {
    acc += shape.chance || 1;
    if (roll <= acc) {
      console.log(`🎲 Rolled shape: ${shape.name} (chance=${shape.chance})`);
      return shape;
    }
  }
  return shapes[0];
}

// Определение зон по углам карты (кубическая система координат)
function filterZone(mapTiles, zoneName, mapSize) {
  const half = Math.floor(mapSize / 3); // центр остаётся "чистым"

  const corners = {
    topLeft:     { q: 0, r: -mapSize, s: mapSize },
    topRight:    { q: mapSize, r: -mapSize, s: 0 },
    right:       { q: mapSize, r: 0, s: -mapSize },
    bottomRight: { q: 0, r: mapSize, s: -mapSize },
    bottomLeft:  { q: -mapSize, r: mapSize, s: 0 },
    left:        { q: -mapSize, r: 0, s: mapSize }
  };

  function hexDistance(a, b) {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs(a.s - b.s)
    );
  }

  if (zoneName === 'center') {
    const cornerTiles = Object.values(corners).flatMap(corner =>
      mapTiles.filter(t => hexDistance(t, corner) <= half)
    );
    const cornerKeys = new Set(cornerTiles.map(t => `${t.q},${t.r},${t.s}`));
    return mapTiles.filter(t => !cornerKeys.has(`${t.q},${t.r},${t.s}`));
  }

  const corner = corners[zoneName];
  if (!corner) return [];

  return mapTiles.filter(t => hexDistance(t, corner) <= half);
}


// 🎲 Рандом с сидом
export function createSeededRNG(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

// 🌱 Кластеризация
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

// ⛰️ Вертикальный рост
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

// ⛰️ Преобразование окружённой земли в холмы
export function applyLandToHillFilter(mapTiles, chance = 1) {
  for (const tile of mapTiles) {
    if (tile.terrainType !== 'land') continue;
    const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
    const hillCount = neighbors.filter(n => n.terrainType === 'hill').length;
    if (hillCount === 6 && Math.random() < chance) {
      tile.terrainType = 'hill';
    }
  }
}

// 🌊 Deep зоны в центре океанов
export function applyWaterToDeepFilter(mapTiles, chance = 0.5) {
  for (const tile of mapTiles) {
    if (tile.terrainType !== 'water') continue;
    const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
    const allWaterOrDeep = neighbors.every(n => ['water', 'deep'].includes(n.terrainType));
    const noLandTouch = neighbors.every(n => !['land', 'hill', 'mount', 'peak', 'surf'].includes(n.terrainType));
    const ringWater = neighbors.filter(n => ['water', 'deep'].includes(n.terrainType)).length >= 5;

    if (allWaterOrDeep && noLandTouch && ringWater && Math.random() < chance) {
      tile.terrainType = 'deep';
    }
  }
}

// 🌊 Обводка суши surf
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

// 👯 Алиас
export const buildZonalIslands = generateZonalIslands;
