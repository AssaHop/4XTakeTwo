// 📂 scenarios/scenarios.js

import { generateHexMap } from '../world/map.js';
import { ClassTemplates } from '../core/classTemplates.js';

const scenarioSettings = {
    default: { size: 15, profile: 'default' },
    island: { size: 3, profile: 'default' },
    maze: { size: 3, profile: 'default' }
};

function generateScenario(type) {
    const scenario = scenarioSettings[type] || { size: 2, profile: 'default' };
    const { size, profile } = scenario;
    const map = generateHexMap(size, 0, 0, profile);

    if (type === 'island') {
        map.forEach(row =>
            row.forEach(cell => {
                const dist = Math.abs(cell.q) + Math.abs(cell.r) + Math.abs(cell.s);
                if (dist > size * 1.5) cell.terrainType = 'peak';
            })
        );
    }

    if (type === 'maze') {
        map.forEach((row, ri) =>
            row.forEach((cell, ci) => {
                if ((ri + ci) % 2 === 0) cell.terrainType = 'mount';
            })
        );
    }

    return map;
}

function getInitialUnitsForScenario(type, map = []) {
    const units = [];
    if (!Array.isArray(map) || map.length === 0) return units;

    function getValidSpawnHexes(unitType, taken = []) {
        const spawnTerrain = ClassTemplates[unitType]?.spawnTerrain ?? ['surf', 'water', 'deep'];
        const flat = map.flat().filter(c => c && spawnTerrain.includes(c.terrainType));

        return flat.filter(cell =>
            !taken.some(t => t.q === cell.q && t.r === cell.r && t.s === cell.s)
        );
    }

    function getRandomFreeHex(unitType, taken = []) {
        const valid = getValidSpawnHexes(unitType, taken);
        return valid[Math.floor(Math.random() * valid.length)];
    }

    if (type === 'default') {
        const unit1Type = 'WDD';
        const unit2Type = 'WCC';

        let cell1 = map.flat().find(c =>
            ClassTemplates[unit1Type]?.spawnTerrain.includes(c.terrainType) &&
            c.q === 0 && c.r === 0 && c.s === 0
        );
        let cell2 = map.flat().find(c =>
            ClassTemplates[unit2Type]?.spawnTerrain.includes(c.terrainType) &&
            c.q === 1 && c.r === -1 && c.s === 0
        );

        if (!cell1) cell1 = getRandomFreeHex(unit1Type);
        if (!cell2 || (cell1 && cell2.q === cell1.q && cell2.r === cell1.r && cell2.s === cell1.s)) {
            cell2 = getRandomFreeHex(unit2Type, [cell1]);
        }

        if (cell1 && cell2) {
            units.push({ q: cell1.q, r: cell1.r, s: cell1.s, type: unit1Type, owner: 'player1' });
            units.push({ q: cell2.q, r: cell2.r, s: cell2.s, type: unit2Type, owner: 'player1' });
        } else {
            console.error("❌ Failed to initialize units: spawn terrain unavailable");
        }
    }

    if (type === 'island' || type === 'maze') {
        const types = ['WDD', 'WCC'];
        const owners = ['player1', 'player2'];

        for (let i = 0; i < 2; i++) {
            const hex = getRandomFreeHex(types[i], units);
            if (hex) {
                units.push({
                    q: hex.q,
                    r: hex.r,
                    s: hex.s,
                    type: types[i],
                    owner: owners[i]
                });
            }
        }
    }

    return units;
}

export { generateScenario, getInitialUnitsForScenario, scenarioSettings };
