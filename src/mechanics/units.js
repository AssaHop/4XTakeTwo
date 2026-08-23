import { state } from '../core/state.js';

import { ClassTemplates } from '../core/classTemplates.js';
import { hasLineOfSight } from './lineOfSight.js';
import { applyModules } from '../core/applyModules.js';
import { techTree } from '../core/techTree.js';
import { ModuleDefinitions } from '../core/modules/allModulesRegistry.js';
import { WeaponTypes } from '../core/modules/weaponTypes.js';
import { canUnitSpawnOnHex } from '../utils/spawnUtils.js';
import { evaluatePostAction } from '../core/gameStateMachine.js';
import { isVisible } from '../world/fogOfWar.js';

// 🧠 Unit class
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
    // Доп. цена входа на конкретный террейн поверх обычной "1 шаг = 1 очко
    // хода" — например {deep: 2}. Отсутствие ключа = обычная цена 1.
    // Независимо от modules/moveTerrain: то ЧТО можно посетить — moveTerrain
    // (жёсткий допуск/запрет), а СКОЛЬКО это стоит — terrainCost (мягкий
    // штраф). См. getAvailableHexes()/pathfinding.js:findPath().
    this.terrainCost = options.terrainCost ?? {};

    const weaponKeys = Array.isArray(this.weType) ? this.weType : (this.weType ? [this.weType] : []);
    const weaponProfiles = weaponKeys.map(k => WeaponTypes[k]).filter(Boolean);
    if (weaponProfiles.length > 0) {
      this.atRange = Math.max(...weaponProfiles.map(wp => wp.range));
    } else {
      this.atRange = options.atRange || 1;
    }

    this.dangerScore   = options.dangerScore   ?? 0;
    this.lifeTurns     = options.lifeTurns     ?? null;
    this.noCounter     = options.noCounter     ?? false;
    // DEF — отдельная от atDamage (ATK) характеристика, по формуле боя
    // Polytopia (attackForce/defenceForce из ATK/DEF × HP%, см.
    // combatLogic.js:computeForces). Дефолт = atDamage (симметрично,
    // атака и контратака равны при полном HP с обеих сторон) — per-класс
    // асимметрию (глушь-пушки, танки и т.д.) можно завести отдельно в
    // classTemplates.js когда дойдёт очередь до баланса.
    this.def           = options.def           ?? this.atDamage;
    this.targetClass   = options.targetClass   ?? 'surface';
    this.veteranLevel  = 0;
    this.kills         = 0;
    this.weaponUnlocks = options.weaponUnlocks ?? {};

    this.canMove = true;
    this.canAct = true;
    this.moveBonusUsed = false;
    this.actBonusUsed = false;

    applyModules(this);
    this.recalculateMobility();

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
    if (this.hasModule('Draft')) additions.push('deep');
    if (this.hasModule('Submerge')) additions.push('water', 'deep');
    if (this.hasModule('Air')) this.ignoresObstacles = true;

    this.moveTerrain = Array.from(new Set([...this.moveTerrain, ...additions]));
  }

  moveTo(q, r, s) {
    if (!this.canMove) {
      console.log(`[MOVE BLOCKED] ${this.type} cannot move again`);
      return false;
    }

    const occupied = state.units.find(u => u.q === q && u.r === r && u.s === s);
    if (occupied) {
      console.warn(`🚫 [MOVE FAIL] ${this.type} попытался переместиться на занятую клетку (${q},${r},${s})`);
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
    evaluatePostAction(this, { type: 'move' });
    return true;
  }

  moveToward(target) {
    if (!this.canMove) return false;

    const hexes = this.getAvailableHexes();
    const sorted = hexes
      .filter(hex => !state.units.find(u => u.q === hex.q && u.r === hex.r && u.s === hex.s))
      .sort((a, b) => {
        const dA = Math.abs(a.q - target.q) + Math.abs(a.r - target.r) + Math.abs(a.s - target.s);
        const dB = Math.abs(b.q - target.q) + Math.abs(b.r - target.r) + Math.abs(b.s - target.s);
        return dA - dB;
      });

    if (sorted.length === 0) {
      console.warn(`🚫 [MOVE BLOCKED] ${this.type} не нашёл путь к цели (${target.q},${target.r},${target.s})`);
      return false;
    }

    const next = sorted[0];
    return this.moveTo(next.q, next.r, next.s);
  }

  canAttack(target) {
    if (!this.canAct || this.owner === target.owner) {
      if (target.owner === this.owner) {
        console.warn(`⚠️ AI пытается атаковать союзника: ${this.type} -> ${target.type}`);
      }
      return false;
    }

    const dx = Math.abs(this.q - target.q);
    const dy = Math.abs(this.r - target.r);
    const dz = Math.abs(this.s - target.s);

    return dx <= this.atRange && dy <= this.atRange && dz <= this.atRange;
  }

  // Dijkstra, не BFS — шаг на террейн с terrainCost стоит больше одного
  // очка moRange, поэтому "раньше нашли — значит дёшево" (обычный BFS)
  // больше не гарантия: дешёвый путь в обход дорогого террейна может
  // прийти позже по очереди. cameCostSoFar хранит лучшую известную цену
  // до гекса; запись из очереди с устаревшей (большей) ценой пропускается.
  getAvailableHexes() {
    const result = [];
    const startKey = `${this.q},${this.r},${this.s}`;
    const costSoFar = new Map([[startKey, 0]]);
    const frontier = [{ q: this.q, r: this.r, s: this.s, cost: 0 }];

    const neighbors = [
      { dq: 1, dr: -1, ds: 0 }, { dq: 1, dr: 0, ds: -1 }, { dq: 0, dr: 1, ds: -1 },
      { dq: -1, dr: 1, ds: 0 }, { dq: -1, dr: 0, ds: 1 }, { dq: 0, dr: -1, ds: 1 }
    ];

    while (frontier.length > 0) {
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift();
      const key = `${current.q},${current.r},${current.s}`;
      if (current.cost > costSoFar.get(key)) continue; // устаревшая запись

      if (current.cost > 0) result.push({ q: current.q, r: current.r, s: current.s });

      // Как в Polytopia ("even if you have 0.5 movement points remaining,
      // you can still move onto a tile costing 1 or even 3") — последний
      // шаг всегда разрешён, если ДО него ещё оставался хоть какой-то
      // запас, даже если сам шаг дороже остатка. Проверяем это здесь (по
      // остатку ДО шага), а не сравнивая newCost с moRange — иначе юнит с
      // 1 очком из 3 не мог бы зайти на дорогой (cost 2) гекс вообще,
      // хотя по бюджету у него ещё есть чем заплатить за один шаг.
      if (current.cost >= this.moRange) continue;

      for (const d of neighbors) {
        const nq = current.q + d.dq, nr = current.r + d.dr, ns = current.s + d.ds;
        const nKey = `${nq},${nr},${ns}`;
        const cell = state.mapIndex?.[nKey];
        if (!cell) continue;

        const terrain = cell.terrainType;
        const isAllowed = this.moveTerrain?.includes(terrain);
        if (!isAllowed && !this.ignoresObstacles) continue;

        const stepCost = this.terrainCost?.[terrain] ?? 1;
        const newCost = current.cost + stepCost;

        if (!costSoFar.has(nKey) || newCost < costSoFar.get(nKey)) {
          costSoFar.set(nKey, newCost);
          frontier.push({ q: nq, r: nr, s: ns, cost: newCost });
        }
      }
    }

    return result;
  }

  getVisibleEnemies() {
    return state.units.filter(u =>
      u.owner !== this.owner &&
      this.distanceTo(u) <= this.viRange
    );
  }

  hasEnemyInRange() {
    return state.units.some(u => this.canAttack(u));
  }

  canReach(target) {
    return this.getAvailableHexes().some(
      h => h.q === target.q && h.r === target.r && h.s === target.s
    );
  }

  isAlive() {
    return this.hp > 0;
  }

  static getAttackableHexes(unit) {
    const targets = new Set();
    const allWeapons = Array.isArray(unit.weType) ? unit.weType : [unit.weType];
    const weaponTypes = Object.keys(unit.weaponUnlocks || {}).length > 0
      ? allWeapons.filter(w => (unit.weaponUnlocks[w] ?? 0) <= (unit.veteranLevel ?? 0))
      : allWeapons;

    for (let weapType of weaponTypes) {
      const config = WeaponTypes[weapType];
      if (!config) continue;

      const range = config.range || unit.atRange;

      for (let dq = -range; dq <= range; dq++) {
        for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
          const ds = -dq - dr;
          const q = unit.q + dq;
          const r = unit.r + dr;
          const s = -q - r;

          const target = state.units.find(u => u.q === q && u.r === r && u.s === s && u.owner !== unit.owner);
          if (!target) continue;

          // Нельзя выбрать целью то, что owner сейчас не видит (fogOfWar) —
          // иначе подсветка атаки и сам клик работали бы "вслепую".
          if (!isVisible(state, unit.owner, target.q, target.r, target.s)) continue;

          // Оружие должно иметь damageVs для класса цели (нет ключа = нельзя атаковать)
          if (config.damageVs && !(( target.targetClass || 'surface') in config.damageVs)) continue;

          if (hasLineOfSight(unit, target, state.mapIndex, weapType)) {
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

  distanceTo(target) {
    return Math.max(
      Math.abs(this.q - target.q),
      Math.abs(this.r - target.r),
      Math.abs(this.s - target.s)
    );
  }
}

const units = state.units;

// Цвет по владельцу — игрок синий, каждый враг свой цвет
const OWNER_COLORS = {
  player1: '#2255cc',
  enemy0:  '#cc2222',
  enemy1:  '#cc7700',
  enemy2:  '#aa00cc',
  enemy3:  '#007755',
  enemy4:  '#cc2277',
  enemy5:  '#997700',
  enemy6:  '#005599',
  enemy7:  '#884400',
};

function getOwnerColor(owner) {
  return OWNER_COLORS[owner] ?? '#555555';
}

function addUnit(q, r, s, type, owner) {
  const cell = state.mapIndex?.[`${q},${r},${s}`];
  const unitOnCell = units.find(u => u.q === q && u.r === r && u.s === s);
  if (!cell || !ClassTemplates[type] || unitOnCell) return;

  if (!canUnitSpawnOnHex(type, cell)) {
    console.warn(`❌ Cannot spawn ${type} on ${cell.terrainType} (${q}, ${r}, ${s})`);
    return;
  }

  const template = ClassTemplates[type];
  const unit = new Unit(q, r, s, type, owner, template);
  unit.color = getOwnerColor(owner);
  units.push(unit);
  console.log(`✅ Unit ADDED: ${type} at (${q}, ${r}, ${s}) | owner: ${owner}`);
}

function generateUnits(unitsList) {
  units.length = 0;
  for (const unit of unitsList) {
    addUnit(unit.q, unit.r, unit.s, unit.type, unit.owner);
  }
  console.log('[DEBUG] All units on map after spawn:');
  state.units.forEach(u => console.log(`${u.type} → ${u.owner}`));
}

function selectUnit(unit) {
  if (!unit) return;

  const isPercyReady = unit.hasModule?.('Percy') && unit.lastAttackWasKill;
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

  import('../ui/highlightManager.js').then(module => {
    module.highlightUnitContext(unit);
  });
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
  hasModule,
  getOwnerColor
};
