import { renderUnits, highlightHexes, renderMap } from '../ui/render.js';
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

    moveTo(q, r, s) {
        if (this.actions <= 0) return;
        const targetCell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
        if (!targetCell || targetCell.type !== 'walkable') return;

        this.q = q;
        this.r = r;
        this.s = s;
        this.actions -= 1;
    }

    getAvailableHexes() {
        const directions = [
            { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 },
            { q: 0, r: -1, s: 1 }, { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }
        ];
        return directions.map(d => {
            const q = this.q + d.q;
            const r = this.r + d.r;
            const s = this.s + d.s;
            const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
            return cell && cell.type === 'walkable' ? { q, r, s } : null;
        }).filter(Boolean);
    }

    select() { this.selected = true; }
    deselect() { this.selected = false; }
    resetActions() { this.actions = 1; }
}

const units = state.units;

function addUnit(q, r, s, type, owner) {
    const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
    if (!cell || cell.type !== 'walkable') return;

    const unit = new Unit(q, r, s, type, owner);
    units.push(unit);
    renderUnits();
}

function generateUnits(num) {
    units.length = 0;
    let attempts = 0;
    while (units.length < num && attempts < 1000) {
        const flat = state.map.flat().filter(c => c.type === 'walkable');
        const cell = flat[Math.floor(Math.random() * flat.length)];
        if (!units.find(u => u.q === cell.q && u.r === cell.r && u.s === cell.s)) {
            addUnit(cell.q, cell.r, cell.s, 'soldier', 'player');
        }
        attempts++;
    }
}

function selectUnit(unit) {
    state.units.forEach(u => u.deselect());
    unit.select();
    state.selectedUnit = unit;
    state.highlightedHexes = unit.getAvailableHexes();
    highlightHexes(state.highlightedHexes);
    renderUnits();
}

function resetUnitsActions() {
    units.forEach(unit => unit.resetActions());
}

export { Unit, units, addUnit, generateUnits, selectUnit, resetUnitsActions };