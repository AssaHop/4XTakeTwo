# Статус контента — модули кораблей

Обновлять при добавлении нового модуля в `core/modules/*Modules.js` или
при реализации эффекта для уже существующего. Проверка "работает ли
эффект" = `grep -rn "\.ИмяФлага\b" src --include="*.js"` и убедиться, что
есть совпадения за пределами файла, где флаг объявлен.

Легенда: ✅ эффект реально читается игровым кодом · ⚠️ эффект задаётся
другим механизмом, не своим `effect()` · ❌ флаг выставляется, но
никем не читается.

**Сессия 8**: убран дублирующий слой флагов `core/unitFlags.js`
(`setupActionFlags()` — ставил свою ВТОРУЮ параллельную копию флагов вроде
`canAttackAfterMove`/`canRepeatAttackOnKill`, вызывалась и напрямую из
`applyModules()`, и ещё раз из `units.js` следом — отсюда была видна
двойная запись `[FLAGS] ... → Object` в консоли на каждый юнит). Теперь
единственный способ проверить "есть ли у юнита способность X" —
`unit.hasModule('X')`, читает `unit.modules` напрямую, всегда в синхроне,
нечему рассинхронизироваться. `noCounter` теперь реально работает —
см. Combat ниже.

## Navigation (`navigationModules.js`)

| Модуль | Описание | Статус | Где читается |
|---|---|---|---|
| Dual | Юнит может двигаться по water, surf, land; по суше 1 гекс | ✅ | `moveTerrain`, `moRange` — `getAvailableHexes()` |
| Sail | Перемещение по water и deep с уменьшением дальности хода | ✅ | `moveTerrain`, `moRange` |
| Navy | Улучшенное перемещение по deep и +1 к дальности атаки | ✅ | `moveTerrain`, `moRange` |
| Air | Игнорирует препятствия, кроме peak | ✅ | `ignoresObstacles` — `getAvailableHexes()` |
| Sneak | Игнорирует препятствия от врагов | ❌ | `ignoresEnemyZone` нигде не читается |
| Steer | Поворот занимает фазу движения | ❌ | `turnTakesAction` нигде не читается |
| Glide | Удвоенная скорость по воде, блокирует Flee | ❌ | `blockFlee` нигде не читается (хотя `moRange *= 2` отрабатывает) |

## Combat (`combatModules.js`)

| Модуль | Описание | Статус | Где читается |
|---|---|---|---|
| Seize | Позволяет юниту превращать вражеского юнита в союзного при attack | ❌ | `unit.specialAttack` нигде не читается |
| Charge | Атака после движения | ⚠️ | НЕ через `unit.canCharge`. Через `hasModule('Charge')` в `gameStateMachine.js`, `aiManager.js` |
| Flee | Движение после атаки | ⚠️ | НЕ через `unit.canFlee`. Через `hasModule('Flee')` в тех же местах + `combatLogic.js` |
| Blast | Действие взрыва — урон по соседям и самоуничтожение | ❌ | `unit.abilities.push('explode')` нигде не читается |
| Hard | Бонус к защите | ❌ | `unit.defenseBonus` нигде не читается |
| Surge | Заморозка атакованных врагов | ⚠️ | Через `hasModule(attacker,'Surge')` в `combatLogic.js`, пишет `target.status.push('frozen')` — но статус `frozen` нигде дальше не читается, эффекта на игру нет |
| Restore | Действие лечения всех союзников вокруг | ❌ | `unit.abilities.push('healNearby')` нигде не читается |
| Percy | Повторная атака при убийстве | ✅ | Через `hasModule('Percy')` в `combatLogic.js`, `aiManager.js`, `units.js:selectUnit`, `ui/highlightManager.js`, `ui/events.js` — самый полно подключённый модуль |
| Corrupt | Накладывает эффект corrode на врага | ⚠️ | Через `hasModule(attacker,'Corrupt')` в `combatLogic.js`, пишет `target.status.push('corroded')` — статус нигде дальше не читается, эффекта на игру нет |
| Splash | Урон по площади | ✅ | **Сессия 9**: `combatLogic.js:performAttack()` — после основного удара бьёт всех вражеских юнитов на соседних с целью гексах той же формулой (`getAttackDamage`), но `round(×0.5)` — половина от полного удара, без контратаки от них и без влияния на Percy-цепочку основной цели. Подключён только WBB (`classTemplates.js`) |
| Stealth | Невидимость для врагов | ❌ | `unit.invisible` нигде не читается |
| Still | Запрещает врагам ответную атаку | ❌ | `unit.disableEnemyRetaliation` нигде не читается |
| Ambush | Предотвращает ответ врага | ❌ | `unit.ambushAttack` нигде не читается |
| Stomp | Урон соседним врагам при движении | ❌ | `unit.stompOnMove` нигде не читается |
| Field | Урон при спауне или перемещении рядом с врагом | ❌ | `unit.fieldDamageAura` нигде не читается |
| Invade | Создаёт дронов при атаке на город | ❌ | `unit.invadeCity` нигде не читается |
| noCounter (поле юнита, не модуль) | Юнит не получает ответный удар при атаке (Dagger-style, см. `ai-design-notes-tribes.md`) | ✅ | **Сессия 8**: `combatLogic.js:performAttack` — контратака реализована по формуле боя настоящей Polytopia (ATK/DEF/HP%, `getCounterDamage()`), проверяет `attacker.noCounter` перед тем как её пропустить. Стоит на AAF/ADB/ATB в `classTemplates.js`, больше ни на ком |
| `unit.def` (новое поле, не модуль) | Defence-стат, отдельный от `atDamage`(ATK) — по формуле Polytopia (`polytopia.fandom.com/wiki/Combat`). Дефолт = `atDamage` (симметрично) в `units.js`, per-класс асимметрия не заведена | ✅ | `combatLogic.js:computeForces()` — `defenseForce = target.def * (target.hp/target.maxHp) * defenseBonus` |

**О "Still" и "Ambush" до сессии 8**: в реестре модулей их описания читались как
взаимоисключающие ("запрещает врагам отвечать" vs "предотвращает ответ
врага" — по сути одно и то же), а старый параллельный слой `unitFlags.js`
переводил их в ДВА разных, содержательно противоречащих друг другу флага
(`disableOwnRetaliation` — "я сам не отвечаю" против `disableEnemyRetaliation`/
`preventEnemyRetaliation` — "враг не отвечает мне"). Слой удалён вместе с
противоречием; сейчас оба модуля просто ничего не делают (❌), контратаку
которую они должны были бы модифицировать регулирует только `noCounter`.
Если возвращаться к Still/Ambush — сначала явно решить, что каждый из них
должен делать относительно новой механики контратаки.

## Support (`supportModules.js`)

| Модуль | Описание | Статус |
|---|---|---|
| Carry | Позволяет нести другого юнита | ❌ |
| Drench | Затапливает атакуемые клетки, превращая в water или deep | ❌ |
| Freeze | Замораживает соседние клетки и врагов при движении | ❌ |
| Prop | Действие Boost — усиливает соседей по атаке и передвижению | ❌ |
| Indy | Не занимает ресурсные слоты | ❌ |
| Explore | Увеличенный радиус разведки | ❌ |

Ни один флаг (`canCarry`, `canDrench`, `freezeOnMove`, `abilities.push('boost')`,
`independent`, `exploreBoost`) нигде не читается вне файла объявления.

## Progression (`progressionModules.js`)

| Модуль | Описание | Статус |
|---|---|---|
| Fuel | После N ходов активирует Drop | ❌ |
| Absorb | Получает HP за каждое убийство | ❌ |
| Evolve | Эволюционирует через несколько ходов | ❌ |
| Stable | Запрещает становиться ветераном | ❌ |
| Drop | Преобразует юнита в ресурсы | ❌ |

Ни один флаг (`fuelTurns`, `absorbKill`, `evolutionStage`, `disableVeterancy`,
`canDrop`) нигде не читается вне файла объявления.

## Итог

10 из ~35 модулей/флагов (Dual, Sail, Navy, Air, Charge, Flee, Percy, Splash,
`noCounter`, плюс частично Corrupt/Surge через отдельный механизм без
итогового эффекта) реально влияют на геймплей. Остальные ~25 — описаны в
реестре, выставляют флаг на юните, но ни один файл игровой логики этот флаг
не проверяет.

`unitActingActions.js` (мёртвый файл, см. AGENTS.md) содержит частичный
список того, что планировалось как "action"-модули (Boost, Explode,
Seize-захват, Invade) — полезно как чек-лист при будущей реализации.
