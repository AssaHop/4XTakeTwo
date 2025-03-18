import { generateHexMap } from '../world/map.js';
import { mapRules } from '../utils/mapRules.js';

const scenarioSettings = {
    default: { size: 15 },
    island: { size: 3 },
    maze: { size: 3 }
};

function generateScenario(type) {
    const size = scenarioSettings[type]?.size || 2;
    let map = generateHexMap(size, 0, 0, mapRules);

    if (type === 'island') {
        map.forEach(row =>
            row.forEach(cell => {
                const dist = Math.abs(cell.q) + Math.abs(cell.r) + Math.abs(cell.s);
                if (dist > size * 1.5) cell.terrainType = 'Peak';
            })
        );
    }

    if (type === 'maze') {
        map.forEach((row, ri) =>
            row.forEach((cell, ci) => {
                if ((ri + ci) % 2 === 0) cell.terrainType = 'Mount';
            })
        );
    }

    return map;
}

function getInitialUnitsForScenario(type, map = []) {
    const units = [];
    if (!Array.isArray(map) || map.length === 0) return units;

    const flat = map.flat().filter(c => c && ["surf", "water", "deep", "land", "hill", "mount", "peak"].includes(c.terrainType));

    // Helper: случайный свободный гекс
    function getRandomFreeHex(taken = []) {
        const free = flat.filter(cell =>
            !taken.some(t => t.q === cell.q && t.r === cell.r && t.s === cell.s)
        );
        return free[Math.floor(Math.random() * free.length)];
    }

    if (type === 'default') {
        let cell1 = flat.find(c => c.q === 0 && c.r === 0 && c.s === 0);
        let cell2 = flat.find(c => c.q === 1 && c.r === -1 && c.s === 0);

        if (!cell1) cell1 = getRandomFreeHex();
        if (!cell2 || cell2 === cell1) cell2 = getRandomFreeHex([cell1]);

        // Ensure cell1 and cell2 are defined before accessing their properties
        if (cell1 && cell2) {
            units.push({ q: cell1.q, r: cell1.r, s: cell1.s, type: 'WDD', owner: 'player1' });
            units.push({ q: cell2.q, r: cell2.r, s: cell2.s, type: 'WCC', owner: 'player1' });
        } else {
            console.error("Failed to initialize units: cell1 or cell2 is undefined");
        }
    }

    if (type === 'island' || type === 'maze') {
        for (let i = 0; i < 2; i++) {
            const hex = getRandomFreeHex(units);
            if (hex) {
                units.push({
                    q: hex.q,
                    r: hex.r,
                    s: hex.s,
                    type: i === 0 ? 'WDD' : 'WCC',
                    owner: i === 0 ? 'player1' : 'player2'
                });
            }
        }
    }

    return units;
}

export { generateScenario, getInitialUnitsForScenario, scenarioSettings };