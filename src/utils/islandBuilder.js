// 📁 src/utils/islandBuilder.js

import { getTile } from '../world/map.js';

export function generateZonalIslands(mapTiles, zones, shapePresets, options = {}) {
  const {
    seed = Date.now()
  } = options;

  const rng = createSeededRNG(seed);
  const usedTiles = new Set();

  for (const zone of zones) {
    const zoneTiles = filterZone(mapTiles, zone.name);
    if (!zoneTiles.length) continue;

    const count = zone.count || 1;

    for (let i = 0; i < count; i++) {
      const origin = zoneTiles[Math.floor(rng() * zoneTiles.length)];
      const shape = rollShape(zone.shapes, rng);
      const deltas = shapePresets[shape.name];

      if (!origin || !deltas) continue;

      for (const delta of deltas) {
        const q = origin.q + delta.q;
        const r = origin.r + delta.r;
        const s = -q - r;
        const key = `${q},${r},${s}`;

        if (usedTiles.has(key)) continue;

        const tile = getTile(q, r, s);
        if (tile) {
          tile.terrainType = shape.type || 'land';
          usedTiles.add(key);
        }
      }
    }
  }
}

function rollShape(shapes, rng) {
  const totalWeight = shapes.reduce((sum, s) => sum + (s.chance || 1), 0);
  const roll = rng() * totalWeight;
  let acc = 0;
  for (const shape of shapes) {
    acc += shape.chance || 1;
    if (roll <= acc) return shape;
  }
  return shapes[0];
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

    if (zoneName === 'topLeft') return q < midQ && r < midR;
    if (zoneName === 'topRight') return q > midQ && r < midR;
    if (zoneName === 'bottomLeft') return q < midQ && r > midR;
    if (zoneName === 'bottomRight') return q > midQ && r > midR;
    if (zoneName === 'left') return q <= qMin + 2;
    if (zoneName === 'right') return q >= qMax - 2;
    if (zoneName === 'centerLeft') return q < midQ && Math.abs(r - midR) < 3;
    if (zoneName === 'centerRight') return q > midQ && Math.abs(r - midR) < 3;
    if (zoneName === 'topEdge') return r <= rMin + 2;
    if (zoneName === 'bottomEdge') return r >= rMax - 2;
    if (zoneName === 'center') return Math.abs(q - midQ) < 3 && Math.abs(r - midR) < 3;

    return false;
  });
}

function createSeededRNG(seed) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

export const buildZonalIslands = generateZonalIslands;
