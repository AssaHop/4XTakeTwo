// 📋 src/world/map.js
import { state } from '../core/state.js'; // ⬅️ нужно для доступа к state.mapIndex

const HEX_RADIUS = 40;

const directions = [
  { dq: 1, dr: -1, ds: 0 },
  { dq: 1, dr: 0, ds: -1 },
  { dq: 0, dr: 1, ds: -1 },
  { dq: -1, dr: 1, ds: 0 },
  { dq: -1, dr: 0, ds: 1 },
  { dq: 0, dr: -1, ds: 1 }
];

function cubeToPixel(q, r, s, offsetX = 0, offsetY = 0, hexOffsetX = 0, hexOffsetY = 0) {
  const size = HEX_RADIUS;
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + offsetX + hexOffsetX;
  const y = size * (3 / 2 * r) + offsetY + hexOffsetY;
  return { x, y };
}

function pixelToCube(x, y, offsetX = 0, offsetY = 0, scale = 1) {
  const size = HEX_RADIUS * scale;
  const px = (x - offsetX) / size;
  const py = (y - offsetY) / size;

  const q = (Math.sqrt(3) / 3 * px - 1 / 3 * py);
  const r = (2 / 3 * py);
  const s = -q - r;

  return cubeRound({ q, r, s });
}

function cubeRound({ q, r, s }) {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  else rs = -rq - rr;

  return { q: rq, r: rr, s: rs };
}

function getNeighbors(q, r, s) {
  return directions.map(dir => ({
    q: q + dir.dq,
    r: r + dir.dr,
    s: s + dir.ds
  }));
}

let mapTiles = [];

function generateHexMap(size, offsetX = 0, offsetY = 0) {
  const map = [];
  mapTiles = [];

  for (let q = -size; q <= size; q++) {
    const rowArray = [];
    for (let r = -size; r <= size; r++) {
      const s = -q - r;
      if (Math.abs(s) <= size) {
        const { x, y } = cubeToPixel(q, r, s, offsetX, offsetY);

        const tile = {
          q, r, s, x, y,
          terrainType: 'water',
          tags: [],
          neighbors: getNeighbors(q, r, s)
        };

        mapTiles.push(tile);
        rowArray.push(tile);
      }
    }
    map.push(rowArray);
  }

  return map;
}

// 🔁 Старый способ: через линейный поиск
function getTile(q, r, s) {
  return mapTiles.find(t => t.q === q && t.r === r && t.s === s);
}

// ⚡ Новый быстрый доступ — если mapIndex уже есть
function getTileFast(q, r, s) {
  return state.mapIndex?.[`${q},${r},${s}`];
}

function getHexCount(size) {
  let count = 0;
  for (let q = -size; q <= size; q++) {
    for (let r = -size; r <= size; r++) {
      const s = -q - r;
      if (Math.abs(s) <= size) count++;
    }
  }
  return count;
}

export {
  generateHexMap,
  getTile,
  getTileFast,        // ✅ экспортируем быстрый метод отдельно
  cubeToPixel,
  pixelToCube,
  cubeRound,
  getNeighbors,
  HEX_RADIUS
};
