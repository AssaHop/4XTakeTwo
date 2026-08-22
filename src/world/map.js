// 📋 src/world/map.js
import { hexRound } from '../mechanics/hexUtils.js';

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

// Общая формула округления кубических координат живёт в mechanics/hexUtils.js
// (там же её использует getHexLine); здесь просто сохраняем имя cubeRound,
// под которым её знают внешние вызовы (ui/events.js).
const cubeRound = hexRound;

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
  cubeToPixel,
  pixelToCube,
  cubeRound,
  getNeighbors,
  HEX_RADIUS
};
