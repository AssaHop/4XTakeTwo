import { renderUnits, highlightHexes } from '../ui/render.js';
import { state } from '../core/state.js';

class Unit {
    constructor(q, r, s, type, owner) {
        this.q = q;
        this.r = r;
        this.s = s;
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

    moveTo(q, r, s) {
        if (this.actions > 0) {
            this.q = q;
            this.r = r;
            this.s = s;
            this.actions -= 1;
        }
    }

    resetActions() {
        this.actions = 1; 
    }

    getAvailableHexes() {
        const availableHexes = [];
        const directions = [
            { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 },
            { q: 0, r: -1, s: 1 }, { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }
        ];
        directions.forEach(direction => {
            const newQ = this.q + direction.q;
            const newR = this.r + direction.r;
            const newS = this.s + direction.s;
            if (state.map[newQ + state.map.length] && state.map[newQ + state.map.length][newR + state.map.length] && state.map[newQ + state.map.length][newR + state.map.length].type === 'walkable') {
                availableHexes.push({ q: newQ, r: newR, s: newS });
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
        const s = -q - r;
        if (state.map[q + state.map.length] && state.map[q + state.map.length][r + state.map.length] && state.map[q + state.map.length][r + state.map.length].type === 'walkable' && !units.some(unit => unit.q === q && unit.r === r && unit.s === s)) {
            const unit = new Unit(q, r, s, 'dd', 'player'); 
            units.push(unit);
            generatedUnits++;
        }
    }
    console.log('Units generated:', units);
    renderUnits();
}

function addUnit(q, r, s, type, owner) {
    const unit = new Unit(q, r, s, type, owner);
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