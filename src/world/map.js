const map = [];
const HEX_RADIUS = 40;
const HEX_HEIGHT = 2 * HEX_RADIUS; // Высота гексагона для вертикальной ориентации
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS; // Ширина гексагона для вертикальной ориентации
const HEX_VERTICAL_SPACING = HEX_RADIUS * 1.05;  // Вертикальное расстояние между гексагонами
const HEX_HORIZONTAL_SPACING = HEX_WIDTH * 0.99; // Горизонтальное расстояние между гексагонами


function axialToPixel(q, r, offsetX, offsetY) {
    const x = HEX_WIDTH * (q + r / 2) + offsetX;  // Горизонтальное смещение
    const y = HEX_VERTICAL_SPACING * r + offsetY;  // Вертикальное смещение
    return { x, y };
}


function generateMap(size) {
    map.length = 0;
    for (let q = -size; q <= size; q++) {
        const rowArray = [];
        for (let r = -size; r <= size; r++) {
            if (Math.abs(q + r) <= size) {
                const cell = {
                    q: q,
                    r: r,
                    type: Math.random() > 0.2 ? 'walkable' : 'non-walkable'
                };
                rowArray.push(cell);
            }
        }
        map.push(rowArray);
    }
    console.log('Map generated:', map);
}

export { map, generateMap, axialToPixel };