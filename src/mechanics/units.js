// 📂 src/mechanics/units.js

import { renderUnits, renderMap, highlightHexes } from '../ui/render.js';
import { state } from '../core/state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { ClassTemplates } from '../core/classTemplates.js';
import { hasLineOfSight } from '../mechanics/lineOfSight.js';

class Unit {
    constructor(q, r, s, type, owner, options = {}) {
        this.q = q;
        this.r = r;
        this.s = s;
        this.type = type;
        this.owner = owner;
        this.actions = 1;
        this.selected = false;

        this.moRange = options.moRange || 1;
        this.viRange = options.viRange || 3;
        this.atRange = options.atRange || 1;
        this.atDamage = options.atDamage || 1;
        this.weType = options.weType || null;

        this.hp = options.hp || 3;
        this.maxHp = options.hp || this.hp;

        this.modules = options.modules || [];
        this.recalculateMobility();

        import('../core/applyModules.js').then(({ applyModules }) => {
            applyModules(this);
        });
    }

    recalculateMobility() {
        if (this.modules.includes('Air')) {
            this.moveTerrain = ['surf', 'water', 'deep', 'land', 'hill', 'mount'];
        } else if (this.modules.includes('Dual')) {
            this.moveTerrain = ['surf', 'land'];
        } else if (this.modules.includes('Sail')) {
            this.moveTerrain = ['surf', 'water', 'deep'];
            this.moRange = Math.max(1, this.moRange - 1); // penalty
        } else if (this.modules.includes('Navy')) {
            this.moveTerrain = ['water', 'deep'];
            this.moRange += 1; // bonus
        } else {
            this.moveTerrain = ['surf', 'land', 'hill'];
        }
    }

    addModule(module) {
        if (!this.modules.includes(module)) {
            this.modules.push(module);
            this.recalculateMobility();

            if (module === 'Navy') {
                this.atRange += 1;
                this.weType = this.weType || 'Main';
            }
            if (module === 'AdvancedGunner') {
                this.atDamage += 1;
            }
            if (module === 'EnhancedVision') {
                this.viRange += 1;
            }
        }
    }

    moveTo(q, r, s) {
        if (this.actions <= 0) return false;

        const allowedHexes = this.getAvailableHexes();
        const isAllowed = allowedHexes.some(h => h.q === q && h.r === r && h.s === s);
        if (!isAllowed) return false;

        const targetCell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
        if (!targetCell || !this.moveTerrain.includes(targetCell.terrainType)) return false;

        this.q = q;
        this.r = r;
        this.s = s;
        this.actions -= 1;
        state.hasActedThisTurn = true;

        updateEndTurnButton(true);

        renderMap(state.scale, state.offset);
        highlightHexes([]);

        return true;
    }

    getAvailableHexes() {
        const range = this.moRange;
        const hexes = [];

        for (let dq = -range; dq <= range; dq++) {
            for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
                const ds = -dq - dr;
                const q = this.q + dq;
                const r = this.r + dr;
                const s = this.s + ds;

                const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
                if (cell && this.moveTerrain.includes(cell.terrainType)) {
                    hexes.push({ q, r, s });
                }
            }
        }
        return hexes;
    }

    getAvailableHexesRaw() {
        const range = this.moRange;
        const hexes = [];

        for (let dq = -range; dq <= range; dq++) {
            for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
                const ds = -dq - dr;
                const q = this.q + dq;
                const r = this.r + dr;
                const s = this.s + ds;

                hexes.push({ q, r, s });
            }
        }
        return hexes;
    }

    select() { this.selected = true; }
    deselect() { this.selected = false; }
    resetActions() { this.actions = 1; }
}

const units = state.units;

function getAttackableHexes(unit) {
    const targets = [];
    const range = unit.atRange;

    for (let dq = -range; dq <= range; dq++) {
        for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
            const ds = -dq - dr;
            const q = unit.q + dq;
            const r = unit.r + dr;
            const s = -q - r;

            const target = state.units.find(u => u.q === q && u.r === r && u.s === s && u.owner !== unit.owner);
            if (target && hasLineOfSight(unit, target, state.map, unit.weType)) {
                targets.push({ q, r, s, isAttack: true });
            }
        }
    }
    return targets;
}

function addUnit(q, r, s, type, owner) {
    const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
    const unitOnCell = units.find(u => u.q === q && u.r === r && u.s === s);

    if (!cell) {
        console.warn(`⚠️ addUnit: cell not found at (${q}, ${r}, ${s})`);
        return;
    }
    if (!ClassTemplates[type]) {
        console.warn(`⚠️ addUnit: unknown ClassTemplate for type "${type}"`);
        return;
    }
    if (unitOnCell) {
        console.warn(`⚠️ addUnit: unit already exists at (${q}, ${r}, ${s})`);
        return;
    }

    const template = ClassTemplates[type];
    const unit = new Unit(q, r, s, type, owner, template);
    units.push(unit);
    console.log(`✅ Unit ADDED: ${type} at (${q}, ${r}, ${s})`);
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
    const moveHexes = unit.getAvailableHexes();
    const attackHexes = getAttackableHexes(unit);
    state.highlightedHexes = [...moveHexes, ...attackHexes];
    highlightHexes(state.highlightedHexes);
    renderUnits();
}

function resetUnitsActions() {
    units.forEach(unit => unit.resetActions());
}

export { Unit, units, addUnit, generateUnits, selectUnit, resetUnitsActions };
