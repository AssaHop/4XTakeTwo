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

        // Добавим параметры диапазона
        this.moveRange = 1;
        this.attackRange = 3;

        // Здоровье — можно вынести позже в конфиг
        this.hp = 3;
        this.maxHp = 3;
    }

    moveTo(q, r, s) {
        if (this.actions <= 0) return;
    
        // Проверка — входит ли в доступные гексы
        const allowedHexes = this.getAvailableHexes();
        const isAllowed = allowedHexes.some(h => h.q === q && h.r === r && h.s === s);
        if (!isAllowed) {
            console.log("❌ Hex out of range for move.");
            return;
        }
    
        const targetCell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
        if (!targetCell || targetCell.type !== 'walkable') return;
    
        this.q = q;
        this.r = r;
        this.s = s;
        this.actions -= 1;
    
        state.hasActedThisTurn = true;
    
        // 💥 Вот ключ
        import('../ui/events.js').then(({ updateEndTurnButton }) => {
            updateEndTurnButton(true);
        });
    }

    getAvailableHexes() {
        const range = this.moveRange;
        const hexes = [];

        for (let dq = -range; dq <= range; dq++) {
            for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
                const ds = -dq - dr;
                const q = this.q + dq;
                const r = this.r + dr;
                const s = this.s + ds;

                const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
                if (cell && cell.type === 'walkable') {
                    hexes.push({ q, r, s });
                }
            }
        }
        return hexes;
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
