const map = [];
const HEX_RADIUS = 40;

function cubeToPixel(x, y, z, offsetX, offsetY) {
    const q = x;
    const r = z;
    const xCoord = HEX_RADIUS * (3/2 * q) + offsetX;
    const yCoord = HEX_RADIUS * (Math.sqrt(3) * (r + q/2)) + offsetY;
    return { x: xCoord, y: yCoord };
}

function generateHexMap(size) {
    map.length = 0;
    for (let q = -size; q <= size; q++) {
        const rowArray = [];
        for (let r = -size; r <= size; r++) {
            const s = -q - r;
            if (Math.abs(s) <= size) {
                const cell = {
                    q: q,
                    r: r,
                    s: s,
                    type: Math.random() > 0.2 ? 'walkable' : 'non-walkable'
                };
                rowArray.push(cell);
            }
        }
        map.push(rowArray);
    }
    console.log('Map generated:', map);
}

export { map, generateHexMap, cubeToPixel, HEX_RADIUS };