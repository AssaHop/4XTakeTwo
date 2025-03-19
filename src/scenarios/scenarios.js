// 📂 src/scenarios/scenarios.js

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

    function getTemplateSpawnCells(unitType) {
        const template = ClassTemplates[unitType];
        if (!template) return [];
        const spawnTerrain = template.spawnTerrain || ["surf", "water", "deep", "land"];
        return map.flat().filter(cell => spawnTerrain.includes(cell.terrainType));
    }

    function getRandomFreeHex(possibleCells, taken = []) {
        const free = possibleCells.filter(cell =>
            !taken.some(t => t.q === cell.q && t.r === cell.r && t.s === cell.s)
        );
        return free[Math.floor(Math.random() * free.length)];
    }

    if (type === 'default') {
        const playerCells = getTemplateSpawnCells('WDD');
        const enemyCells = getTemplateSpawnCells('WBB');

        let cell1 = playerCells.find(c => c.q === 0 && c.r === 0 && c.s === 0);
        let cell2 = playerCells.find(c => c.q === 1 && c.r === -1 && c.s === 0);
        let enemy1 = enemyCells.find(c => c.q === -1 && c.r === 1 && c.s === 0);
        let enemy2 = enemyCells.find(c => c.q === 2 && c.r === -2 && c.s === 0);

        if (!cell1) cell1 = getRandomFreeHex(playerCells);
        if (!cell2 || cell2 === cell1) cell2 = getRandomFreeHex(playerCells, [cell1]);
        if (!enemy1) enemy1 = getRandomFreeHex(enemyCells, [cell1, cell2]);
        if (!enemy2 || enemy2 === enemy1) enemy2 = getRandomFreeHex(enemyCells, [cell1, cell2, enemy1]);

        units.push({ q: cell1.q, r: cell1.r, s: cell1.s, type: 'WDD', owner: 'player1' });
        units.push({ q: cell2.q, r: cell2.r, s: cell2.s, type: 'WCC', owner: 'player1' });
        units.push({ q: enemy1.q, r: enemy1.r, s: enemy1.s, type: 'WCC', owner: 'enemy' });
        units.push({ q: enemy2.q, r: enemy2.r, s: enemy2.s, type: 'WBB', owner: 'enemy' });
    }

    if (type === 'island' || type === 'maze') {
        const cells = getTemplateSpawnCells('WDD');
        for (let i = 0; i < 2; i++) {
            const hex = getRandomFreeHex(cells, units);
            if (hex) {
                units.push({
                    q: hex.q,
                    r: hex.r,
                    s: hex.s,
                    type: i === 0 ? 'WDD' : 'WCC',
                    owner: i === 0 ? 'player1' : 'enemy'
                });
            }
        }
    }

    return units;
}

export { generateScenario, getInitialUnitsForScenario, scenarioSettings };