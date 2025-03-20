// 📂 src/mechanics/units.js

import { renderUnits, renderMap, highlightHexes } from '../ui/render.js';
import { state } from '../core/state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { ClassTemplates } from '../core/classTemplates.js';
import { hasLineOfSight } from './lineOfSight.js';
import { applyModules } from '../core/applyModules.js';
import { setupActionFlags } from '../core/unitFlags.js';
import { techTree } from '../core/techTree.js';
import { ModuleDefinitions } from '../core/modules/allModulesRegistry.js';
import { handlePostMovePhase } from '../core/gameStateMachine.js';
import { highlightUnitContext } from '../ui/highlightManager.js';

class Unit {
  constructor(q, r, s, type, owner, options = {}) {
    this.q = q;
    this.r = r;
    this.s = s;
    this.type = type;
    this.owner = owner;
    this.actions = 1;
    this.selected = false;

    this.hp = options.hp || 3;
    this.maxHp = options.hp || this.hp;
    this.moRange = options.moRange || 1;
    this.viRange = options.viRange || 3;
    this.atRange = options.atRange || 1;
    this.atDamage = options.atDamage || 1;
    this.weType = options.weType || null;
    this.modules = options.modules || [];

    this.pendingChargeAttack = false;

    this.recalculateMobility();
    applyModules(this);
    setupActionFlags(this);
  }

  hasModule(modName) {
    return Array.isArray(this.modules) && this.modules.includes(modName);
  }

  upgradeWithModule(modName) {
    if (!this.hasModule(modName)) {
      this.modules.push(modName);
      applyModules(this);
      setupActionFlags(this);
    }
  }

  upgradeWithAvailableTech() {
    const available = Object.values(ModuleDefinitions).filter(
      mod => mod.requiresTech && techTree.isUnlocked(mod.requiresTech)
    );
    for (let mod of available) {
      if (!this.hasModule(mod.name)) {
        this.upgradeWithModule(mod.name);
      }
    }
  }

  recalculateMobility() {
    if (this.modules.includes('Air')) {
      this.moveTerrain = ['surf', 'water', 'deep', 'land', 'hill', 'mount'];
    } else if (this.modules.includes('Dual')) {
      this.moveTerrain = ['surf', 'land'];
    } else if (this.modules.includes('Sail')) {
      this.moveTerrain = ['surf', 'water', 'deep'];
      this.moRange = Math.max(1, this.moRange - 1);
    } else if (this.modules.includes('Navy')) {
      this.moveTerrain = ['water', 'deep'];
      this.moRange += 1;
    } else {
      this.moveTerrain = ['surf', 'land', 'hill'];
    }
  }

  moveTo(q, r, s) {
    if (this.actions <= 0) return false;
  
    if (this.moveUsed && !this.hasModule('Flee')) {
      console.warn('[Move] Already moved once');
      return false;
    }
  
    const allowed = this.getAvailableHexes();
    const allowedTarget = allowed.find(h => h.q === q && h.r === r && h.s === s);
    if (!allowedTarget) return false;
  
    this.q = q;
    this.r = r;
    this.s = s;
    this.actions -= 1;
    this.moveUsed = true;
  
    // ✅ CHARGE срабатывает сразу после Move
    if (
      this.hasModule('Charge') &&
      !this.chargeBonusGiven
    ) {
      console.log(`⚡ [Charge Bonus] +1 Action after Move`);
      this.actions += 1;
      this.chargeBonusGiven = true;
    }
  
    renderMap(state.scale, state.offset);
    handlePostMovePhase(this);
    return true;
  }
  

  getAvailableHexes() {
    const visited = new Set();
    const result = [];
    const frontier = [{ q: this.q, r: this.r, s: this.s, dist: 0 }];

    while (frontier.length > 0) {
      const current = frontier.shift();
      const key = `${current.q},${current.r},${current.s}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const cell = state.map.flat().find(c => c.q === current.q && c.r === current.r && c.s === current.s);
      if (!cell || !this.moveTerrain.includes(cell.terrainType)) continue;
      if (current.dist > 0) result.push({ q: current.q, r: current.r, s: current.s });

      if (current.dist < this.moRange) {
        const neighbors = [
          { dq: 1, dr: -1, ds: 0 }, { dq: 1, dr: 0, ds: -1 }, { dq: 0, dr: 1, ds: -1 },
          { dq: -1, dr: 1, ds: 0 }, { dq: -1, dr: 0, ds: 1 }, { dq: 0, dr: -1, ds: 1 }
        ];
        for (let d of neighbors) {
          frontier.push({ q: current.q + d.dq, r: current.r + d.dr, s: current.s + d.ds, dist: current.dist + 1 });
        }
      }
    }

    return result;
  }

  static getAttackableHexes(unit) {
    const targets = [];
    for (let dq = -unit.atRange; dq <= unit.atRange; dq++) {
      for (let dr = Math.max(-unit.atRange, -dq - unit.atRange); dr <= Math.min(unit.atRange, -dq + unit.atRange); dr++) {
        const ds = -dq - dr;
        const q = unit.q + dq;
        const r = unit.r + dr;
        const s = unit.s + ds;
        const target = state.units.find(u => u.q === q && u.r === r && u.s === s && u.owner !== unit.owner);
        if (target && hasLineOfSight(unit, target, state.map, unit.weType)) {
          targets.push({ q, r, s, isAttack: true });
        }
      }
    }
    return targets;
  }

  select() { this.selected = true; }
  deselect() { this.selected = false; }
  resetActions() {
    this.actions = 1;
    this.moveUsed = false; // 💥 добавить обязательно
    this.chargeBonusGiven = false; // 💥 и это
  }
}

const units = state.units;

function addUnit(q, r, s, type, owner) {
  const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
  const unitOnCell = units.find(u => u.q === q && u.r === r && u.s === s);
  if (!cell || !ClassTemplates[type] || unitOnCell) return;
  const template = ClassTemplates[type];
  const unit = new Unit(q, r, s, type, owner, template);
  unit.color = owner === 'enemy' ? '#666' : undefined;
  units.push(unit);
  renderUnits();
  console.log(`✅ Unit ADDED: ${type} at (${q}, ${r}, ${s})`);
}

function generateUnits(unitsList) {
  units.length = 0;
  for (const unit of unitsList) {
    addUnit(unit.q, unit.r, unit.s, unit.type, unit.owner);
  }
  console.log('[DEBUG] All units on map after spawn:');
  state.units.forEach(u => console.log(`${u.type} actions=${u.actions}`));
}

function selectUnit(unit) {
  if (!unit || unit.actions <= 0) return;
  state.units.forEach(u => u.deselect());
  unit.select();
  state.selectedUnit = unit;
  highlightUnitContext(unit);
  console.log(`[DEBUG] Selected unit actions: ${unit.actions}`);
  renderUnits();
}

function resetUnitsActions() {
  units.forEach(unit => unit.resetActions());
}

function performAttack(attacker, defender) {
  if (!attacker || !defender || attacker.actions <= 0) return false;
  defender.hp -= attacker.atDamage;
  if (defender.hp <= 0) {
    const index = state.units.indexOf(defender);
    if (index > -1) state.units.splice(index, 1);
    console.log(`💥 Unit destroyed at (${defender.q}, ${defender.r}, ${defender.s})`);
  }
  attacker.actions -= 1;
  state.hasActedThisTurn = true;
  updateEndTurnButton();
  renderUnits();
  return true;
}

export { Unit, units, addUnit, generateUnits, selectUnit, resetUnitsActions, performAttack };
