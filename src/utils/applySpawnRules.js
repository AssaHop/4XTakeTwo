import { getTile } from '../world/map.js';

// 🚩 Основная логика спаун-правил
export function applySpawnRules(tile, mapTiles, rules) {
  const rule = rules.spawnRules[tile.terrainType];
  if (!rule) return;

  const neighborCoords = tile.neighbors;
  const neighbors = neighborCoords.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);

  let conditionMet = true;

  if (rule.condition) {
    const conditions = rule.condition.split(',');
    const matched = neighbors.filter(n => conditions.includes(n.terrainType));
    if (rule.requiredNeighbors && matched.length < rule.requiredNeighbors) {
      conditionMet = false;
    } else if (!rule.requiredNeighbors && matched.length === 0) {
      conditionMet = false;
    }
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

// 🌋 Расширенная логика: "слоистые острова"
export function applyLayeredIslandRules(mapTiles) {
  const waterTiles = mapTiles.filter(t => t.terrainType === 'water');
  const clusters = clusterize(waterTiles);

  for (const cluster of clusters) {
    if (cluster.length < 6) continue;

    const islandCenter = getClusterCenter(cluster);
    const size = cluster.length;
    const type = classifyIsland(size);
    applyLayers(islandCenter, type);
  }
}

function classifyIsland(size) {
  if (size < 10) return 'micro';
  if (size < 20) return 'small';
  if (size < 35) return 'medium';
  return 'large';
}

function applyLayers(centerTile, type) {
  const rings = getRings(centerTile, 4);

  if (type === 'micro') {
    setTerrain(rings[0], 'land');
    setTerrain(rings[1], 'surf');
  } else if (type === 'small') {
    setTerrain(rings[0], 'hill');
    setTerrain(rings[1], 'land');
    setTerrain(rings[2], 'surf');
  } else if (type === 'medium') {
    setTerrain(rings[0], 'mount');
    setTerrain(rings[1], 'hill');
    setTerrain(rings[2], 'land');
    setTerrain(rings[3], 'surf');
  } else if (type === 'large') {
    setTerrain(rings[0], 'peak');
    setTerrain(rings[1], 'mount');
    setTerrain(rings[2], 'hill');
    setTerrain(rings[3], 'land');
    setTerrain(getOuterRing(rings[3]), 'surf');
  }
}

function setTerrain(tiles, terrain) {
  for (const tile of tiles) {
    if (tile) tile.terrainType = terrain;
  }
}

function getRings(centerTile, depth) {
  const rings = [];
  let currentRing = [centerTile];
  const visited = new Set([coordKey(centerTile)]);

  for (let i = 0; i < depth; i++) {
    const nextRing = [];

    for (const tile of currentRing) {
      const neighbors = tile.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);
      for (const neighbor of neighbors) {
        const key = coordKey(neighbor);
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
    for (const n of neighbors) {
      outer.add(n);
    }
  }
  return [...outer];
}

function getClusterCenter(cluster) {
  const avg = cluster.reduce((acc, t) => {
    acc.q += t.q;
    acc.r += t.r;
    acc.s += t.s;
    return acc;
  }, { q: 0, r: 0, s: 0 });

  const center = {
    q: Math.round(avg.q / cluster.length),
    r: Math.round(avg.r / cluster.length),
    s: Math.round(avg.s / cluster.length)
  };

  return getTile(center.q, center.r, center.s) || cluster[0];
}

function coordKey(t) {
  return `${t.q},${t.r},${t.s}`;
}

function clusterize(tiles) {
  const visited = new Set();
  const clusters = [];

  for (const tile of tiles) {
    const key = coordKey(tile);
    if (visited.has(key)) continue;

    const cluster = [];
    const stack = [tile];

    while (stack.length > 0) {
      const current = stack.pop();
      const k = coordKey(current);
      if (visited.has(k)) continue;

      visited.add(k);
      cluster.push(current);

      const neighbors = current.neighbors.map(n => getTile(n.q, n.r, n.s)).filter(n =>
        n?.terrainType === current.terrainType &&
        !visited.has(coordKey(n))
      );

      stack.push(...neighbors);
    }

    clusters.push(cluster);
  }

  return clusters;
  console.log(`🌋 applyLayeredIslandRules: STARTED`);
}
