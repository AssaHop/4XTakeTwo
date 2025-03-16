// 📂 world/map.js

const HEX_RADIUS = 40;
const squashFactor = 0.7;

function cubeToPixel(q, r, s, offsetX = 0, offsetY = 0, hexOffsetX = 0, hexOffsetY = 0) {
    const size = HEX_RADIUS;
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + offsetX + hexOffsetX;
    const y = size * (3 / 2 * r * squashFactor) + offsetY + hexOffsetY;
    return { x, y };
}

function pixelToCube(x, y, offsetX = 0, offsetY = 0, scale = 1) {
    const size = HEX_RADIUS * scale;
    const px = (x - offsetX) / size;
    const py = (y - offsetY) / size / squashFactor;

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

// 🔸 Случайный terrainType (для тестов, потом можно заменить на генератор биомов)
function randomTerrainType() {
    const terrains = [
        "Surf", "Water", "Water", "Deep", "Land", "Land", "Hill", "Mount", "Peak"
    ];
    return terrains[Math.floor(Math.random() * terrains.length)];
}

let mapTiles = [];

function generateHexMap(size, offsetX = 0, offsetY = 0) {
    const map = [];
    mapTiles = []; // сохраняем в глобальный список
    for (let q = -size; q <= size; q++) {
        const rowArray = [];
        for (let r = -size; r <= size; r++) {
            const s = -q - r;
            if (Math.abs(s) <= size) {
                const { x, y } = cubeToPixel(q, r, s, offsetX, offsetY);
                const terrainType = randomTerrainType();

                const tile = {
                    q,
                    r,
                    s,
                    x,
                    y,
                    terrainType,
                    tags: [],
                    neighbors: getNeighbors(q, r, s)
                };

                // Пример: добавим current на часть воды
                if ((terrainType === "Water" || terrainType === "Deep") && Math.random() < 0.3) {
                    tile.tags.push("current");
                    tile.currentDirection = "NE"; // временно
                }

                rowArray.push(tile);
                mapTiles.push(tile);
            }
        }
        map.push(rowArray);
    }
    console.log('🗺️ Map generated with terrainTypes:', map);
    return map;
}

// 🔍 Получить тайл по координатам
function getTile(q, r, s) {
    return mapTiles.find(t => t.q === q && t.r === r && t.s === s);
}

export {
    generateHexMap,
    getTile,
    cubeToPixel,
    pixelToCube,
    cubeRound,
    getNeighbors,
    HEX_RADIUS,
    squashFactor
};
