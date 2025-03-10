// 📂 world/map.js

const HEX_RADIUS = 40;
const squashFactor = 0.7;

// 🔸 cube → pixel (позиционирование гексов на canvas)
function cubeToPixel(q, r, s, offsetX = 0, offsetY = 0, hexOffsetX = 0, hexOffsetY = 0) {
    const size = HEX_RADIUS;
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + offsetX + hexOffsetX;
    const y = size * (3 / 2 * r * squashFactor) + offsetY + hexOffsetY;
    // console.log(`📍 cubeToPixel - q: ${q}, r: ${r}, s: ${s} → x: ${x.toFixed(2)}, y: ${y.toFixed(2)}, offsetX: ${offsetX}, offsetY: ${offsetY}`);
    return { x, y };
}

// 🔸 pixel → cube (определение координат гекса из курсора)
function pixelToCube(x, y, offsetX = 0, offsetY = 0, scale = 1) {
    const size = HEX_RADIUS * scale;
    const px = (x - offsetX) / size;
    const py = (y - offsetY) / size / squashFactor;

    const q = (Math.sqrt(3) / 3 * px - 1 / 3 * py);
    const r = (2 / 3 * py);
    const s = -q - r;

    return cubeRound({ q, r, s });
}

// 🔸 Округление координат куба до ближайшего гекса
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

// 🔸 Направления соседей для гекса
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

// 🔸 Генерация карты
function generateHexMap(size, offsetX = 0, offsetY = 0) {
    const map = [];
    for (let q = -size; q <= size; q++) {
        const rowArray = [];
        for (let r = -size; r <= size; r++) {
            const s = -q - r;
            if (Math.abs(s) <= size) {
                const { x, y } = cubeToPixel(q, r, s, offsetX, offsetY);
                rowArray.push({
                    q,
                    r,
                    s,
                    x,
                    y,
                    type: Math.random() > 0.2 ? 'walkable' : 'non-walkable',
                    neighbors: getNeighbors(q, r, s)
                });
            }
        }
        map.push(rowArray);
    }
    console.log('🗺️ Map generated:', map);
    return map;
}

// ✅ Экспорт
export {
    generateHexMap,
    cubeToPixel,
    pixelToCube,
    cubeRound,
    getNeighbors,
    HEX_RADIUS,
    squashFactor
};
