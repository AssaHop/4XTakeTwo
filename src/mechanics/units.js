import { renderUnits, renderMap } from '../ui/render.js';
import { state } from '../core/state.js';
import { updateEndTurnButton } from '../ui/uiControls.js';
import { ClassTemplates } from '../core/classTemplates.js';
import { hasLineOfSight } from './lineOfSight.js';
import { applyModules } from '../core/applyModules.js';
import { setupActionFlags } from '../core/unitFlags.js';
import { techTree } from '../core/techTree.js';
import { ModuleDefinitions } from '../core/modules/allModulesRegistry.js';
import { WeaponTypes } from '../core/modules/weaponTypes.js';
import { highlightUnitContext } from '../ui/highlightManager.js';
import { evaluatePostAction } from '../core/gameStateMachine.js';
import { canUnitSpawnOnHex } from '../utils/spawnUtils.js';

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
    this.atDamage = options.atDamage || 1;
    this.weType = options.weType || null;
    this.modules = options.modules || [];

    const weaponProfile = WeaponTypes[this.weType];
    if (weaponProfile) {
      this.atRange = weaponProfile.range;
      this.weaponProfile = weaponProfile;
    } else {
      this.atRange = options.atRange || 1;
    }

    this.canMove = true;
    this.canAct = true;
    this.moveBonusUsed = false;
    this.actBonusUsed = false;

    applyModules(this);
    this.recalculateMobility();
    setupActionFlags(this);

    // 🧠 AI профиль
    this.aiRole = options.aiProfile?.role || 'neutral';
    this.aiOverrides = options.aiProfile?.overrides || {};
    this.aiRisk = options.aiProfile?.risk ?? 0.3;
  }

  hasModule(modName) {
    return Array.isArray(this.modules) && this.modules.includes(modName);
  }

  upgradeWithModule(modName) {
    if (!this.hasModule(modName)) {
      this.modules.push(modName);
      applyModules(this);
      this.recalculateMobility();
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
    if (!this.moveTerrain) this.moveTerrain = [];

    const additions = [];
    if (this.hasModule('Sail')) additions.push('surf', 'water');
    if (this.hasModule('Navy')) additions.push('deep');
    if (this.hasModule('Dual')) additions.push('land');
    if (this.hasModule('Air')) this.ignoresObstacles = true;

    this.moveTerrain = Array.from(new Set([...this.moveTerrain, ...additions]));
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

    while (frontier.length > 0) {
      const current = frontier.shift();
      const key = `${current.q},${current.r},${current.s}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const cell = state.map.flat().find(c => c.q === current.q && c.r === current.r && c.s === current.s);
      if (!cell) continue;

      const terrain = cell.terrainType;
      const isAllowed = this.moveTerrain?.includes(terrain);
      const blocked = !isAllowed && !this.ignoresObstacles;

      if (blocked) continue;
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
    const targets = new Set();
    const weaponTypes = Array.isArray(unit.weType) ? unit.weType : [unit.weType];

    for (let weapType of weaponTypes) {
      const config = WeaponTypes[weapType];
      if (!config) continue;

      const range = config.range || unit.atRange;

      for (let dq = -range; dq <= range; dq++) {
        for (
          let dr = Math.max(-range, -dq - range);
          dr <= Math.min(range, -dq + range);
          dr++
        ) {
          const ds = -dq - dr;
          const q = unit.q + dq;
          const r = unit.r + dr;
          const s = -q - r;

          const target = state.units.find(
            (u) => u.q === q && u.r === r && u.s === s && u.owner !== unit.owner
          );
          if (!target) continue;

          if (hasLineOfSight(unit, target, state.map, weapType)) {
            targets.add(`${q},${r},${s}`);
          }
        }
      }
    }

    return [...targets].map(str => {
      const [q, r, s] = str.split(',').map(Number);
      return { q, r, s, isAttack: true };
    });
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

  if (!canUnitSpawnOnHex(type, cell)) {
    console.warn(`❌ Cannot spawn ${type} on ${cell.terrainType} (${q}, ${r}, ${s})`);
    return;
  }

  const template = ClassTemplates[type];
  const unit = new Unit(q, r, s, type, owner, template);
  unit.color = owner?.startsWith('enemy') ? '#755' : '#000';
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
    

  const isInactive = (!unit.canAct && !unit.canMove && !isPercyReady) || (!hasMoves && !hasAttacks);

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

export {
  Unit,
  units,
  addUnit,
  generateUnits,
  selectUnit,
  resetUnitsActions,
  hasModule
};
