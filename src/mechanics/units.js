import { renderUnits, highlightHexes } from '../ui/render.js';
import { state } from '../core/state.js';

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

    moveTo(q, r) {
        if (this.actions > 0) {
            this.q = q;
            this.r = r;
            this.actions -= 1;
        }
    }

    resetActions() {
        this.actions = 1; 
    }

    getAvailableHexes() {
        const availableHexes = [];
        const directions = [
            { q: 1, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 1 },
            { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 }
        ];
        directions.forEach(direction => {
            const newQ = this.q + direction.q;
            const newR = this.r + direction.r;
            if (state.map[newQ + state.map.length] && state.map[newQ + state.map.length][newR + state.map.length] && state.map[newQ + state.map.length][newR + state.map.length].type === 'walkable') {
                availableHexes.push({ q: newQ, r: newR });
            }
        });
        return availableHexes;
    }

    select() {
        this.selected = true;
    }

    deselect() {
        this.selected = false;
    }
}

const units = state.units;

function generateUnits(numUnits) {
    units.length = 0;
    let generatedUnits = 0;
    while (generatedUnits < numUnits) {
        const q = Math.floor(Math.random() * (state.map.length * 2 + 1)) - state.map.length;
        const r = Math.floor(Math.random() * (state.map.length * 2 + 1)) - state.map.length;
        if (state.map[q + state.map.length] && state.map[q + state.map.length][r + state.map.length] && state.map[q + state.map.length][r + state.map.length].type === 'walkable' && !units.some(unit => unit.q === q && unit.r === r)) {
            const unit = new Unit(q, r, 'dd', 'player'); 
            units.push(unit);
            generatedUnits++;
        }
    }
    console.log('Units generated:', units);
    renderUnits();
}

function addUnit(q, r, type, owner) {
    const unit = new Unit(q, r, type, owner);
    units.push(unit);
    renderUnits();
}

function resetUnitsActions() {
    units.forEach(unit => unit.resetActions());
}

function selectUnit(unit) {
    if (state.selectedUnit) {
        state.selectedUnit.deselect();
    }
    unit.select();
    state.selectedUnit = unit;
    state.highlightedHexes = unit.getAvailableHexes();
    highlightHexes(state.highlightedHexes);
    renderUnits();
}

export { generateUnits, addUnit, Unit, units, resetUnitsActions, selectUnit };