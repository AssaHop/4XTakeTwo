import { renderUnits, highlightHexes } from '../ui/render.js';
import { state } from '../core/state.js';
import { updateEndTurnButton } from '../ui/events.js';

class Unit {
    constructor(q, r, s, type, owner) {
        this.q = q;
        this.r = r;
        this.s = s;
        this.type = type;
        this.owner = owner;
        this.actions = 1;
        this.selected = false;
        this.hp = 3;
        this.maxHp = 3;
    }

    moveTo(q, r, s) {
        if (this.actions <= 0) return;
        const targetCell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
        const occupied = state.units.some(u => u.q === q && u.r === r && u.s === s);
        if (!targetCell || targetCell.type !== 'walkable' || occupied) return;
    
        this.q = q;
        this.r = r;
        this.s = s;
        this.actions -= 1;
    
        // 💥 Считаем как действие
        state.hasActedThisTurn = true;
        updateEndTurnButton(true);
        if (this.actions <= 0) {
            this.deselect();
            state.selectedUnit = null;
            state.highlightedHexes = [];
        }
        updateEndTurnButton(true);
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
            const hasUnit = state.units.find(u => u.q === q && u.r === r && u.s === s);
            return (cell && cell.type === 'walkable' && !hasUnit) ? { q, r, s } : null;
        }).filter(Boolean);
    }

    select() { this.selected = true; }
    deselect() { this.selected = false; }
    resetActions() { this.actions = 1; }
}

const units = state.units;

function addUnit(q, r, s, type, owner) {
    const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
    const unitOnCell = units.find(u => u.q === q && u.r === r && u.s === s);
    if (!cell || cell.type !== 'walkable' || unitOnCell) return;

    const unit = new Unit(q, r, s, type, owner);
    units.push(unit);
    renderUnits();
}

function generateUnits(unitsList) {
    units.length = 0;
    for (const unit of unitsList) {
        addUnit(unit.q, unit.r, unit.s, unit.type, unit.owner);
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
