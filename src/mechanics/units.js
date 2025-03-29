// ✅ units.js (обновлён — корректная навигация через moveTerrain + Air)

import { renderUnits, renderMap } from '../ui/render.js';
import { state } from '../core/state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { ClassTemplates } from '../core/classTemplates.js';
import { hasLineOfSight } from './lineOfSight.js';
import { applyModules } from '../core/applyModules.js';
import { setupActionFlags } from '../core/unitFlags.js';
import { techTree } from '../core/techTree.js';
import { ModuleDefinitions } from '../core/modules/allModulesRegistry.js';
import { highlightUnitContext, clearAllHighlights } from '../ui/highlightManager.js';
import { evaluatePostAction } from '../core/gameStateMachine.js';

class Unit {
  constructor(q, r, s, type, owner, options = {}) {
    this.q = q;
    this.r = r;
    this.s = s;
    this.type = type;
    this.owner = owner;
    this.selected = false;

    this.hp = options.hp || 3;
    this.maxHp = options.hp || this.hp;
    this.moRange = options.moRange || 1;
    this.viRange = options.viRange || 3;
    this.atRange = options.atRange || 1;
    this.atDamage = options.atDamage || 1;
    this.weType = options.weType || null;
    this.modules = options.modules || [];

    // 🔄 Флаги FSM
    this.canMove = true;
    this.canAct = true;
    this.moveBonusUsed = false;
    this.actBonusUsed = false;

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
    this.moveTerrain = ['surf', 'land', 'hill'];
  }

  moveTo(q, r, s) {
    if (!this.canMove) {
      console.log(`[MOVE BLOCKED] ${this.type} cannot move again`);
      return false;
    }

    const allowed = this.getAvailableHexes();
    const allowedTarget = allowed.find(h => h.q === q && h.r === r && h.s === s);
    if (!allowedTarget) {
      console.log(`[MOVE BLOCKED] Target hex not in available move list`);
      return false;
    }

    this.q = q;
    this.r = r;
    this.s = s;
    this.canMove = false;
    this.canAct = false;

    console.log(`🚶 [MOVE] ${this.type} moved to (${q},${r},${s})`);

    renderMap(state.scale, state.offset);
    evaluatePostAction(this, { type: 'move' });

    return true;
  }

  getAvailableHexes() {
    const visited = new Set();
    const result = [];
    const frontier = [{ q: this.q, r: this.r, s: this.s, dist: 0 }];

    console.log(`🔍 [DEBUG] getAvailableHexes: Unit=${this.type} at (${this.q},${this.r},${this.s}) moRange=${this.moRange}`);

    while (frontier.length > 0) {
      const current = frontier.shift();
      const key = `${current.q},${current.r},${current.s}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const cell = state.map.flat().find(c => c.q === current.q && c.r === current.r && c.s === current.s);

      if (!cell) {
        console.warn(`⚠️ [No Cell] (${current.q},${current.r},${current.s}) not found on map`);
        continue;
      }

      const terrain = cell.terrainType;
      const isAllowed = this.moveTerrain?.includes(terrain);
      const blocked = !isAllowed && !this.ignoresObstacles;

      if (blocked) {
        console.log(`🚫 [Terrain Blocked] ${terrain} at (${cell.q},${cell.r},${cell.s})`);
        continue;
      }

      if (current.dist > 0) {
        result.push({ q: current.q, r: current.r, s: current.s });
      }

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

    console.log(`✅ [HEXES RESULT] ${result.length} reachable tiles for ${this.type}`);
    return result;
  }

  static getAttackableHexes(unit) {
    const targets = [];
    for (let dq = -unit.atRange; dq <= unit.atRange; dq++) {
      for (let dr = Math.max(-unit.atRange, -dq - unit.atRange); dr <= Math.min(unit.atRange, -dq + unit.atRange); dr++) {
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

  select() { this.selected = true; }
  deselect() { this.selected = false; }

  resetActions() {
    this.canMove = true;
    this.canAct = true;
    this.moveBonusUsed = false;
    this.actBonusUsed = false;
  }
}

const units = state.units;

function addUnit(q, r, s, type, owner) {
  const cell = state.map.flat().find(c => c.q === q && c.r === r && c.s === s);
  const unitOnCell = units.find(u => u.q === q && u.r === r && u.s === s);
  if (!cell || !ClassTemplates[type] || unitOnCell) return;

  const moveSet = ClassTemplates[type]?.moveTerrain || [];
  const terrain = cell?.terrainType;

  const isBlockedSpawn = !moveSet.includes(terrain);

  if (isBlockedSpawn) {
    console.warn(`❌ Cannot spawn ${type} on ${terrain} (${q}, ${r}, ${s})`);
    return;
  }

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
  state.units.forEach(u => console.log(`${u.type} actions=?`));
}

function selectUnit(unit) {
  if (!unit) return;

  const hasMoves = unit.getAvailableHexes().length > 0;
  const hasAttacks = Unit.getAttackableHexes(unit).length > 0;
  const isPercyReady = unit.canRepeatAttackOnKill && unit.lastAttackWasKill && hasAttacks;

  const isInactive =
    (!unit.canAct && !unit.canMove && !isPercyReady) ||
    (!hasMoves && !hasAttacks);

  if (isInactive) {
    console.warn(`⚠️ [Guard] ${unit.type} cannot act – skip selection`);
    return;
  }

  state.units.forEach(u => u.deselect());
  unit.select();
  state.selectedUnit = unit;
  highlightUnitContext(unit);
  console.log(`[SELECT] Unit ${unit.type} selected → move=${unit.canMove}, act=${unit.canAct}, moRange=${unit.moRange}, atRange=${unit.atRange}`);
  renderUnits();
}

function resetUnitsActions() {
  units.forEach(unit => unit.resetActions());
}

function hasModule(unit, modName) {
  return Array.isArray(unit.modules) && unit.modules.includes(modName);
}

export { Unit, units, addUnit, generateUnits, selectUnit, resetUnitsActions, hasModule };