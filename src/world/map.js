const map = [];
const HEX_RADIUS = 40;

// Новые параметры расстояний между гексами по горизонтали и вертикали
const HORIZONTAL_SPACING = 0.7; // Коэффициент для увеличения расстояния по горизонтали
const VERTICAL_SPACING = 1.5; // Коэффициент для увеличения расстояния по вертикали

function cubeToPixel(q, r, s, offsetX = 0, offsetY = 0) {
    const xCoord = HEX_RADIUS * (3/2 * q) * HORIZONTAL_SPACING + offsetX;
    const yCoord = HEX_RADIUS * (Math.sqrt(3) * (r + q/2)) * VERTICAL_SPACING + offsetY;
    return { x: xCoord, y: yCoord };
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
    map.length = 0;
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
}

export { map, generateHexMap, cubeToPixel, HEX_RADIUS, getNeighbors };