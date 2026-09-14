// src/ai/fsm/states/attackState.js
import { hexDistance } from '../../../mechanics/hexUtils.js';
import { hasLineOfSight } from '../../../mechanics/lineOfSight.js';
import { findPath } from '../../../mechanics/pathfinding.js';
import { getAttackDamage, getCounterDamage } from '../../../core/combatLogic.js';
import { getAllegiance, getLeaderPressure } from '../../../core/diplomacy.js';
import { simulateAttack, tradeValue, dangerRatio } from '../../combatSimulator.js';
import { isVisible } from '../../../world/fogOfWar.js';
import { canAffordSpawn, hasFleetRoom, canAffordUpgrade } from '../../../core/economyLogic.js';

// Шаг C: масштаб tradeValue относительно остальных слагаемых scoreTarget
// (allegiance ±60, dangerRatio*DANGER_SCALE ~0-45, добивание до 30).
// tradeValue сам по себе уже в сопоставимом диапазоне, 1 = не искажать;
// тюнинговый рычаг на будущее, если понадобится по playtest.
const TRADE_VALUE_SCALE = 1;

// Переводит dangerRatio (безразмерное соотношение угроза/hp, обычно 0-1.5)
// в тот же порядок величины, что раньше давала ручная dangerScore-константа
// (10-45) — чтобы остальные слагаемые score не пришлось перекалибровывать.
const DANGER_SCALE = 30;

// Низкоприоритетные типы действий — реальные атаки/захват точек всегда
// побеждают их в общем сравнении, но они выше 0 (idle), чтобы юнит без
// боевых целей всё равно куда-то шёл, а не стоял просто из-за того, что
// "исследование"/"отступление" не дотянули до боевого score.
const RETREAT_SCORE = 10;
const SEARCH_SCORE = 1;

// Спаун с точки захвата — тоже кандидат в общем пуле, не отдельная фаза
// хода (сессия 11, 2026-09-13, по мотивам разбора Tribes SimplePortfolio —
// SPAWN конкурирует с ATTACK/MOVE/CAPTURE на одной шкале score, см.
// docs/sessions/2026-09-13-session11.md). Под угрозой — почти как боевое
// решение (сравнимо с хорошей атакой), фоном — чуть выше SEARCH/RETREAT,
// чтобы не забивало реальный бой, но срабатывало когда боя рядом нет.
const SPAWN_THREAT_RADIUS = 3; // тот же радиус, что updateCapturePoints() использует для contest
const SPAWN_SCORE_THREATENED = 50;
const SPAWN_SCORE_ECONOMY = 15;
// Апгрейд вместимости точки — тоже кандидат, но предлагается ТОЛЬКО когда
// флот уже упёрся в лимит (иначе спаун сразу растит армию, апгрейд — нет,
// сравнивать их в общем случае не с чем; см. economyLogic.js:
// hasFleetRoom/canAffordUpgrade). Score сопоставим с "спаун под угрозой" —
// когда деваться больше некуда, апгрейд — единственный способ расти дальше.
const UPGRADE_SCORE = 50;

export class AttackState {
  constructor(gameState, owner) {
    this.gameState = gameState;
    this.owner     = owner; // 'enemy0', 'enemy1' итд
  }

  // Глобальный жадный выбор (по мотивам Tribes SimpleAgent.act(): движок
  // не идёт юнит-за-юнитом в порядке спауна — на каждом шаге среди ВСЕХ
  // ещё не походивших юнитов ищется единственное самое привлекательное
  // действие across the board, оно выполняется, состояние обновляется,
  // поиск лучшего повторяется заново). Раньше порядок юнитов был чистой
  // случайностью (порядок в state.units, т.е. порядок спауна) — теперь
  // порядка "по умолчанию" нет вообще, юнит с самым выгодным ходом прямо
  // сейчас всегда идёт первым, независимо от того, где он в списке.
  //
  // executeCallback: async (action) => void — вызывается сразу после
  // решения, ДО пересчёта следующего лучшего действия. Так combo "один
  // подранил — другой добивает" работает по всей армии сразу, а не только
  // внутри фиксированного порядка перебора.
  async execute(executeCallback) {
    let remainingUnits = this.gameState.units.filter(u => u.owner === this.owner && (u.canMove || u.canAct));
    // Точки захвата — тоже источник кандидатов (спаун), не юниты, но
    // участвуют в ТОЙ ЖЕ глобальной конкуренции по score (см. константы
    // SPAWN_SCORE_* выше). Каждая точка может "походить" (заспаунить) не
    // больше одного раза за вызов execute() — убирается из списка сразу
    // после того как её кандидат выигрывает цикл, независимо от исхода.
    let remainingCPs = (this.gameState.capturePoints || []).filter(cp => cp.owner === this.owner);

    if (this.gameState.units.some(u => u.owner === this.owner) && remainingUnits.length === 0) {
      console.warn(`⚠️ [${this.owner}] Все юниты истощены: canMove/canAct = false`);
    }

    const actions = [];

    while (remainingUnits.length > 0 || remainingCPs.length > 0) {
      let best = null; // { source: 'unit'|'cp', actor, candidate: {action, score} }

      for (const unit of remainingUnits) {
        for (const c of this.candidatesFor(unit)) {
          if (!best || c.score > best.candidate.score) best = { source: 'unit', actor: unit, candidate: c };
        }
      }

      for (const cp of remainingCPs) {
        const c = this.decideCPAction(cp);
        if (c && (!best || c.score > best.candidate.score)) best = { source: 'cp', actor: cp, candidate: c };
      }

      if (!best) break;

      actions.push(best.candidate.action);
      if (executeCallback) await executeCallback(best.candidate.action);

      if (best.source === 'cp') {
        remainingCPs = remainingCPs.filter(cp => cp !== best.actor);
        continue;
      }

      // idle — тупик для этого хода, юнита больше не рассматриваем, даже
      // если canMove/canAct у него формально ещё true (иначе он снова
      // окажется "лучшим" в следующей итерации и цикл не завершится).
      // Остальные — по факту canMove/canAct (move/attack всегда гасят
      // хотя бы один флаг, см. units.js:moveTo/combatLogic.js:performAttack;
      // исключение — Percy/Flee бонус, тогда юнит законно остаётся).
      remainingUnits = remainingUnits.filter(u => {
        if (u === best.actor && best.candidate.action.type === 'idle') return false;
        return this.gameState.units.includes(u) && (u.canMove || u.canAct);
      });
    }

    return actions;
  }

  // Спаун как кандидат (см. константы SPAWN_SCORE_* выше). Приоритет типа
  // юнита — по мотивам Tribes SimpleAgent.evalSpawn(): статичный список,
  // модулированный одним булевым сигналом "враг у точки прямо сейчас"
  // (дешёвый WDD под угрозой, иначе самое дорогое по карману).
  decideSpawnAction(cp) {
    const threatened = this.gameState.units.some(u =>
      u.owner !== this.owner && hexDistance(u, cp) <= SPAWN_THREAT_RADIUS
    );
    const priority = threatened ? ['WDD', 'WCC', 'WBB'] : ['WBB', 'WCC', 'WDD'];
    const type = priority.find(t => canAffordSpawn(this.gameState, this.owner, t));
    if (!type) return null;

    const score = threatened ? SPAWN_SCORE_THREATENED : SPAWN_SCORE_ECONOMY;
    return { action: { type: 'spawn', cp, unitType: type }, score };
  }

  // Апгрейд вместимости КОНКРЕТНОЙ точки (не путать с будущим tech tree
  // для разблокировки классов юнитов — это отдельная тема, см.
  // economyLogic.js). Предлагается только когда спаун физически
  // заблокирован лимитом флота — иначе спаун и апгрейд не с чем сравнивать
  // на общей шкале (апгрейд не даёт немедленной военной пользы).
  decideUpgradeAction(cp) {
    if (hasFleetRoom(this.gameState, this.owner)) return null;
    if (!canAffordUpgrade(this.gameState, this.owner, cp)) return null;
    return { action: { type: 'upgradeCapacity', cp }, score: UPGRADE_SCORE };
  }

  // Кандидат точки захвата — лучшее из "заспаунить юнита" и "прокачать
  // вместимость" (см. выше). Обе функции возвращают {action, score} в
  // общей шкале, execute() просто берёт максимум среди всех точек и юнитов.
  decideCPAction(cp) {
    const spawn = this.decideSpawnAction(cp);
    const upgrade = this.decideUpgradeAction(cp);
    if (!spawn) return upgrade;
    if (!upgrade) return spawn;
    return upgrade.score > spawn.score ? upgrade : spawn;
  }

  // Все разумные кандидаты-действия для ОДНОГО юнита прямо сейчас, со
  // score на общей шкале с остальными юнитами (см. execute()). Не полный
  // перебор всех гексов карты (это было бы избыточно на нашем масштабе) —
  // по одному кандидату на каждую осмысленную "стратегию" (атаковать
  // лучшую цель, отступить от неё, идти к точке захвата, искать врага),
  // сама стратегия внутри уже даёт лучший ход/цель через существующие
  // bestStepToward/scoreTarget/decideCaptureAction.
  candidatesFor(unit) {
    const candidates = [];

    // Кандидаты — все чужие юниты (не только player1); кого из них реально
    // атаковать решает allegiance-вес в scoreTarget(). Только те, что этот
    // юнит вообще может поразить (damageVs), и которые owner реально видит
    // сейчас (fogOfWar) — иначе AI бьёт из тумана.
    const liveTargets = this.gameState.units.filter(t =>
      t.owner !== unit.owner &&
      getAttackDamage(unit, t) !== null &&
      isVisible(this.gameState, this.owner, t.q, t.r, t.s)
    );

    if (liveTargets.length > 0) {
      const scored = liveTargets.map(t => ({
        target: t,
        score:  this.scoreTarget(unit, t)
      })).sort((a, b) => b.score - a.score);

      const best   = scored[0];
      const target = best.target;
      const dist   = hexDistance(unit, target);

      // Отступление — не грубое сравнение статов и не счётчик-хардкод (оба
      // варианта ломаются: стат-сравнение не видит текущий HP цели/себя,
      // счётчик рано или поздно заставит атаковать туда, где это буквально
      // самоубийство просто потому что "лимит исчерпан"). Вместо этого —
      // точный расчёт по настоящей формуле боя: атакуем, если ЭТА атака
      // прямо сейчас нас не убьёт (или убивает цель раньше, чем она успеет
      // ответить). Порог "рассасывается" сам по себе по мере того, как цель
      // теряет HP (contr-урон формулы масштабируется её текущим HP/maxHP —
      // см. combatLogic.js:computeForces) — без искусственного таймера.
      const inTargetRange = dist <= (target.atRange || 1);
      let mustRetreat = false;

      if (inTargetRange) {
        const dmgNow = unit.canAct && dist <= unit.atRange ? getAttackDamage(unit, target) : null;
        const lethalNow = dmgNow !== null && dmgNow >= target.hp;

        // Групповая добивающая атака (Step A: юниты решают ПО ОЧЕРЕДИ, каждый
        // следующий видит уже подбитую цель) требует, чтобы ПЕРВЫЙ из группы
        // вообще решился атаковать — а по одиночке та же лобовая проверка
        // тоже сочла бы это самоубийством и он отступил бы, ничего не
        // подбив, и вся группа отступила бы следом. Проверяем: сколько
        // СВОИХ юнитов (включая этого) прямо сейчас может достать эту же
        // цель — если суммарный урон убивает её, риск одного оправдан
        // общим результатом, отступление пропускаем.
        const helpers = this.gameState.units.filter(u =>
          u.owner === unit.owner && u.canAct &&
          hexDistance(u, target) <= u.atRange
        );
        const combinedDamage = helpers.reduce((sum, u) => {
          const d = getAttackDamage(u, target);
          return d !== null ? sum + d : sum;
        }, 0);
        const groupCanFinish = helpers.length > 1 && combinedDamage >= target.hp;

        // Реально ли ЭТА атака нас убьёт — не "цель сильнее по цифрам", а
        // настоящий getCounterDamage (та же формула, что применит
        // combatLogic.js:performAttack, с текущими HP обеих сторон).
        const counterIfWeAttack = dmgNow !== null && !lethalNow
          ? getCounterDamage(unit, target)
          : null;
        const wouldDie = counterIfWeAttack !== null && counterIfWeAttack >= unit.hp;

        mustRetreat = wouldDie && !lethalNow && !groupCanFinish;
      }

      if (mustRetreat && unit.canMove) {
        const retreat = this.bestRetreatStep(unit, liveTargets);
        if (retreat) candidates.push({ action: { type: 'move', unit, destination: retreat }, score: RETREAT_SCORE });
      } else if (unit.canAct && dist <= unit.atRange) {
        const los = hasLineOfSight(unit, target, this.gameState.mapIndex, unit.weType);
        if (los) {
          candidates.push({ action: { type: 'attack', unit, target }, score: best.score });

          // Заряженная спецатака (Torp-абилка, см. classTemplates.js) —
          // отдельный кандидат, не замена обычной атаки: конкурирует по
          // score, юнит сам "решает" тратить заряд именно на ЭТУ цель или
          // поберечь для другой (тот же принцип, что и остальные кандидаты).
          if (unit.torpedoAbility && (unit.torpCharge || 0) >= unit.torpedoAbility.chargeNeeded) {
            const mult = unit.torpedoAbility.multiplier;
            const boostedScore = this.scoreTarget(unit, target, { multiplier: mult });
            candidates.push({ action: { type: 'attack', unit, target, multiplier: mult }, score: boostedScore });
          }
        } else if (unit.canMove) {
          const dest = this.bestStepWithLoS(unit, target);
          if (dest) candidates.push({ action: { type: 'move', unit, destination: dest, target }, score: best.score });
        }
      } else if (unit.canMove) {
        const optimalRange = Math.max(0, unit.atRange - 1);
        const dest = this.bestStepToward(unit, target, optimalRange);
        if (dest) candidates.push({ action: { type: 'move', unit, destination: dest, target }, score: best.score });
      }
    }

    const cpAction = this.decideCaptureAction(unit);
    if (cpAction) candidates.push({ action: cpAction, score: cpAction.cpScore });

    if (candidates.length === 0) {
      const search = this.decideSearchAction(unit);
      if (search) candidates.push({ action: search, score: SEARCH_SCORE });
    }

    if (candidates.length === 0) {
      candidates.push({ action: { type: 'idle', unit }, score: 0 });
    }

    return candidates;
  }

  // Move toward an unclaimed or enemy-owned capture point.
  // Returns action with cpScore so candidatesFor can compare vs enemy chase.
  decideCaptureAction(unit) {
    if (!unit.canMove) return null;
    const cps = (this.gameState.capturePoints || [])
      .filter(cp => cp.owner !== this.owner);
    if (!cps.length) return null;

    const scored = cps.map(cp => {
      let score = cp.owner ? 40 : 60;
      if (cp.claimant === this.owner) score += 20;
      score -= hexDistance(unit, cp) * 1.0;
      return { cp, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best) return null;

    // Already in contest range — stay put, capture logic handles the rest
    if (hexDistance(unit, best.cp) <= 3) return null;

    const dest = this.bestStepToward(unit, best.cp);
    if (!dest) return null;

    return { type: 'move', unit, destination: dest, cpScore: best.score };
  }

  // Нет видимой цели и нет точки захвата. Под новой моделью тумана (см.
  // fogOfWar.js — explored=навсегда видно, отдельной "живой" зоны обзора
  // на уже открытой территории больше нет) это означает буквально: ни
  // один враг не стоит ни на одном исследованном гексе — либо все мертвы,
  // либо прячутся на территории, которую этот owner ещё ни разу не видел.
  // Единственный осмысленный ход — идти исследовать неизвестное (тот же
  // принцип, что "Incentive to explore: next to fog" в Tribes SimpleAgent
  // .evalMove — см. docs/ai-design-notes-tribes.md). Без этого юнит без
  // цели и без точки захвата стоит на месте НАВСЕГДА (подтверждено
  // battle-sim: фронт замирает намертво через ~20 ходов после первой
  // стычки).
  decideSearchAction(unit) {
    if (!unit.canMove) return null;
    const frontier = this.nearestUnexploredHex(unit);
    if (!frontier) return null; // вся карта уже открыта и пуста от врагов — искать негде
    const dest = this.bestStepToward(unit, frontier);
    if (!dest) return null;
    return { type: 'move', unit, destination: dest };
  }

  nearestUnexploredHex(unit) {
    const tiles = Object.values(this.gameState.mapIndex || {});
    let best = null;
    let bestDist = Infinity;
    for (const tile of tiles) {
      if (isVisible(this.gameState, this.owner, tile.q, tile.r, tile.s)) continue; // isVisible=isExplored сейчас
      const d = hexDistance(unit, tile);
      if (d < bestDist) { bestDist = d; best = tile; }
    }
    return best;
  }

  // Гекс из доступных, максимизирующий минимальную дистанцию до всех threats
  // (не обязательно всех врагов на карте — только те, что реально видны
  // этому юниту сейчас, т.е. targets из execute()).
  bestRetreatStep(unit, threats) {
    const available = unit.getAvailableHexes();
    if (!available.length) return null;

    const occupied = new Set(this.gameState.units.map(u => `${u.q},${u.r},${u.s}`));
    const free = available.filter(h => !occupied.has(`${h.q},${h.r},${h.s}`));
    if (!free.length) return null;

    return free.sort((a, b) => {
      const distA = Math.min(...threats.map(t => hexDistance(a, t)));
      const distB = Math.min(...threats.map(t => hexDistance(b, t)));
      return distB - distA;
    })[0];
  }

  // multiplier — оценка ГИПОТЕТИЧЕСКОЙ заряженной атаки (Torp-абилка), не
  // трогает обычный расчёт (default=1). dangerRatio/hpPercent/дистанция не
  // зависят от того, каким ударом мы бы атаковали — только tradeValue
  // пересчитывается с учётом буста, это и есть единственная причина
  // заряженному кандидату оценивать себя выше обычного.
  scoreTarget(unit, target, { multiplier = 1 } = {}) {
    let score = 0;

    // Дипломатический вес (allegiance-матрица, core/diplomacy.js): чем хуже
    // отношения unit.owner↔target.owner, тем выше приоритет цели. Игрок
    // стартует с перекосом (см. initAllegiance), поэтому остаётся
    // приоритетной целью для всех enemy-фракций без отдельного if'а —
    // но реальный конфликт между двумя AI тоже сработает, если их
    // отношения испортятся сильнее, чем с игроком.
    score += -getAllegiance(this.gameState, unit.owner, target.owner);

    // "Ганг-ап на лидера" (сессия 11, попытка сбить экономический снежный
    // ком точек захвата) — чем больше у target.owner точек захвата
    // относительно среднего по всем владельцам, тем выше приоритет бить
    // именно его юниты. LEADER_PRESSURE_WEIGHT=0 в diplomacy.js полностью
    // отключает эффект без правок здесь.
    score += getLeaderPressure(this.gameState, target.owner);

    // Опасность цели — эмерджентная, не ручная константа (dangerScore
    // убрана). dangerRatio = сколько target нанёс бы НАМ, ударив первым,
    // делённое на его текущий HP: бьёт больно и сам умирает легко = высокий
    // приоритет ("glass cannon"). strategicValue (редкое явное исключение,
    // например WCA-носитель — см. classTemplates.js) добавляется отдельно,
    // напрямую, не через это соотношение — его ценность не про бой вообще.
    score += dangerRatio(unit, target) * DANGER_SCALE + (target.strategicValue || 0);

    // Добить раненого выгодно
    const hpPercent = target.hp / (target.maxHp || target.hp);
    score += (1 - hpPercent) * 30;

    // Штраф за дистанцию — уменьшен с 3 до 1 чтобы дальние юниты не idle
    const dist = hexDistance(unit, target);
    score -= dist * 1;

    // Не атаковать если сами почти мертвы
    if (unit.hp <= 1) score -= 30;

    // Шаг C: симулированный обмен вместо двух хардкод-порогов (было: +40 за
    // любой килл, −60 за любую свою смерть, независимо от того, кого убили/
    // потеряли). Контр-риск учитывается только если мы СЕЙЧАС в радиусе
    // ответки цели (тот же guard, что был у старого −60) — "можем ли добить"
    // такого guard'а не требует, приоритет цели валиден и до подхода.
    const inCounterRange = dist <= (target.atRange || 1);
    const sim = simulateAttack(unit, target, { inCounterRange, multiplier });
    score += tradeValue(unit, target, sim) * TRADE_VALUE_SCALE;

    return score;
  }

  // Возвращает лучший доступный гекс в сторону цели.
  // Использует findPath (A*) для построения полного маршрута через карту —
  // это позволяет обойти препятствия (острова), которые чисто жадный шаг
  // по прямой дистанции не может обойти (см. known-issues #2/#22).
  // За этот ход всё равно делается только один шаг, ограниченный moRange.
  // optimalRange: не заходить ближе этой дистанции к цели (range-aware stop).
  bestStepToward(unit, target, optimalRange = 0) {
    const available = unit.getAvailableHexes();
    if (!available.length) return null;

    const occupied = new Set(
      this.gameState.units.map(u => `${u.q},${u.r},${u.s}`)
    );
    const availableKeys = new Set(
      available
        .filter(hex => !occupied.has(`${hex.q},${hex.r},${hex.s}`))
        .map(hex => `${hex.q},${hex.r},${hex.s}`)
    );

    const path = findPath(unit, target, this.gameState.mapIndex, unit);

    if (path.length > 0) {
      // Два прохода: сначала ищем шаг с соблюдением optimalRange,
      // при неудаче — любой допустимый шаг по пути.
      for (let pass = 0; pass < 2; pass++) {
        for (let i = path.length - 1; i >= 0; i--) {
          const key = `${path[i].q},${path[i].r},${path[i].s}`;
          if (!availableKeys.has(key)) continue;
          if (pass === 0 && optimalRange > 0 && hexDistance(path[i], target) < optimalRange) continue;
          return path[i];
        }
      }
    }

    // findPath не нашёл маршрут (например, цель полностью отрезана) —
    // fallback на старое поведение: ближайший по прямой свободный гекс.
    const sorted = [...available].sort(
      (a, b) => hexDistance(a, target) - hexDistance(b, target)
    );
    for (const hex of sorted) {
      const key = `${hex.q},${hex.r},${hex.s}`;
      if (availableKeys.has(key)) return hex;
    }

    return null;
  }
 
  // Ищет гекс из доступных с которого есть LoS на цель и в зоне атаки
  bestStepWithLoS(unit, target) {
    const available = unit.getAvailableHexes();
    if (!available.length) return null;
 
    const occupied = new Set(
      this.gameState.units.map(u => `${u.q},${u.r},${u.s}`)
    );
 
    // Ищем гекс в зоне атаки с LoS
    const candidates = available.filter(hex => {
      if (occupied.has(`${hex.q},${hex.r},${hex.s}`)) return false;
      const dist = hexDistance(hex, target);
      if (dist > unit.atRange) return false;
      return hasLineOfSight(hex, target, this.gameState.mapIndex, unit.weType);
    });
 
    if (candidates.length) {
      // Из кандидатов берём тот что ближе к цели
      candidates.sort((a, b) => hexDistance(a, target) - hexDistance(b, target));
      return candidates[0];
    }
 
    // Нет позиции с LoS в зоне атаки — просто идём ближе
    return null;
  }
}