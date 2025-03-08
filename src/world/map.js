import { mapOffsetX, mapOffsetY } from '../core/game.js';

const map = [];
const HEX_RADIUS = 40;

// Параметры расстояний между гексами по горизонтали и вертикали
const HORIZONTAL_SPACING = 1; // Коэффицент для увеличения расстояния по горизонтали
const VERTICAL_SPACING = 1; // Коэффицент для увеличения расстояния по вертикали

// Коэффицент сжатия для вертикального расстояния
const squashFactor = 0.7; // Например, сжатие на 20%

function cubeToPixel(q, r, s, offsetX = 0, offsetY = 0, hexOffsetX = 0, hexOffsetY = 0) {
    const size = HEX_RADIUS;
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + mapOffsetX + hexOffsetX;
    const y = size * (3 / 2 * r * squashFactor) + mapOffsetY + hexOffsetY;

    
    return { x, y };
}

const directions = [
    { dq: 1, dr: -1, ds: 0 },
    { dq: 1, dr: 0, ds: -1 },
    { dq: 0, dr: 1, ds: -1 },
    { dq: -1, dr: 1, ds: 0 },
    { dq: -1, dr: 0, ds: 1 },
    { dq: 0, dr: -1, ds: 1 }
];

function getNeighbors(q, r, s) {
    return directions.map(dir => ({
        q: q + dir.dq,
        r: r + dir.dr,
        s: s + dir.ds
    }));
}

function generateHexMap(size, offsetX = 0, offsetY = 0) {
    const map = []; // Локальная переменная map
    for (let q = -size; q <= size; q++) {
        const rowArray = [];
        for (let r = -size; r <= size; r++) {
            const s = -q - r;
            if (Math.abs(s) <= size) {
                const { x, y } = cubeToPixel(q, r, s, offsetX, offsetY);
                const cell = {
                    q: q,
                    r: r,
                    s: s,
                    x: x,
                    y: y,
                    type: Math.random() > 0.2 ? 'walkable' : 'non-walkable',
                    neighbors: getNeighbors(q, r, s)
                };
                rowArray.push(cell);
            }
        }
        map.push(rowArray);
    }
    console.log('Map generated:', map);
    return map; // Возвращаем сгенерированную карту
}

export { map, generateHexMap, cubeToPixel, HEX_RADIUS, getNeighbors, squashFactor };