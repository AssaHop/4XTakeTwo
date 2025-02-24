import { renderUnits } from '../ui/render.js';
import { map } from '../core/game.js'; // Добавим импорт map

class Unit {
    constructor(q, r, type, owner) {
        this.q = q;
        this.r = r;
        this.type = type;
        this.owner = owner;
        this.actions = 1;
        this.selected = false;
    }

    checkState() {
        // Реализация состояния юнита
    }

    upgrade() {
        // Реализация улучшения юнита
    }
}

const units = []; // Добавим экспорт units

function generateUnits(numUnits) {
    units.length = 0;
    let generatedUnits = 0;
    while (generatedUnits < numUnits) {
        const q = Math.floor(Math.random() * (map.length * 2 + 1)) - map.length;
        const r = Math.floor(Math.random() * (map.length * 2 + 1)) - map.length;
        if (map[q + map.length] && map[q + map.length][r + map.length] && map[q + map.length][r + map.length].type === 'walkable' && !units.some(unit => unit.q === q && unit.r === r)) {
            const unit = new Unit(q, r, 'dd', 'player'); 
            units.push(unit);
            generatedUnits++;
        }
    }
    console.log('Units generated:', units);
    renderUnits();
}

export { generateUnits, Unit, units };