import { generateHexMap } from '../world/map.js';

function generateScenario(type, size) {
    if (type === 'default') {
        return generateHexMap(size);
    }
    if (type === 'island') {
        const map = generateHexMap(size);
        map.forEach(row => row.forEach(cell => {
            const dist = Math.abs(cell.q) + Math.abs(cell.r) + Math.abs(cell.s);
            if (dist > size * 1.5) cell.type = 'non-walkable';
        }));
        return map;
    }
    if (type === 'maze') {
        const map = generateHexMap(size);
        map.forEach((row, ri) => row.forEach((cell, ci) => {
            if ((ri + ci) % 2 === 0) cell.type = 'non-walkable';
        }));
        return map;
    }
    return generateHexMap(size);
}

export { generateScenario };