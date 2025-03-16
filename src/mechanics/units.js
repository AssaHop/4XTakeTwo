// 📂 mechanics/units.js
import { renderUnits, highlightHexes } from '../ui/render.js';
import { state } from '../core/state.js';
import { updateEndTurnButton } from '../ui/events.js';
import { ClassTemplates } from '../core/classTemplates.js';

class Unit {
    constructor(q, r, s, type, owner, options = {}) {
        this.q = q;
        this.r = r;
        this.s = s;
        this.type = type;
        this.owner = owner;
        this.actions = 1;
        this.selected = false;

        this.moveRange = options.moveRange || 1;
        this.visionRange = options.visionRange || 3;
        this.attackRange = options.attackRange || 1;
        this.attackDamage = options.attackDamage || 1;
        this.weaponType = options.weaponType || null;

        this.hp = options.hp || 3;
        this.maxHp = options.maxHp || this.hp;

        this.modules = options.modules || [];

        // ✨ Применим поведенческие модули
        import('../core/applyModules.js').then(({ applyModules }) => {
            applyModules(this);
        });
    }

    moveTo(q, r, s) {
        if (this.actions <= 0) return false;

        const allowedHexes = this.getAvailableHexes();
        const isAllowed = allowedHexes.some(h => h.q === q && h.r === r && h.s === s);
        if (!isAllowed) {
            console.log("❌ Hex out of range for move.");
            return false;
        }

        const targetCell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
        if (!targetCell || targetCell.terrainType === 'Peak') return false;

        this.q = q;
        this.r = r;
        this.s = s;
        this.actions -= 1;
        state.hasActedThisTurn = true;

        import('../ui/events.js').then(({ updateEndTurnButton }) => {
            updateEndTurnButton(true);
        });

        return true;
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
                if (cell && cell.terrainType !== 'Peak') {
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
    if (!cell || cell.terrainType === 'Peak' || unitOnCell) return;

    const template = ClassTemplates[type];
    if (!template) {
        console.warn(`⚠️ Unknown unit type: ${type}`);
        return;
    }

    const unit = new Unit(q, r, s, type, owner, template);
    units.push(unit);
    renderUnits();
}

function generateUnits(unitsList) {
    units.length = 0;
    for (const unit of unitsList) {
        // 💥 Переопределение устаревших типов
        if (unit.type === 'soldier') unit.type = 'WDD';
        if (unit.type === 'archer') unit.type = 'WCC';

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
