# Статус контента — модули кораблей

Обновлять при добавлении нового модуля в `core/modules/*Modules.js` или
при реализации эффекта для уже существующего. Проверка "работает ли
эффект" = `grep -rn "\.ИмяФлага\b" src --include="*.js"` и убедиться, что
есть совпадения за пределами файла, где флаг объявлен.

Легенда: ✅ эффект реально читается игровым кодом · ⚠️ эффект задаётся
другим механизмом, не своим `effect()` · ❌ флаг выставляется, но
никем не читается.

## Navigation (`navigationModules.js`)

| Модуль | Статус | Где читается |
|---|---|---|
| Dual | ✅ | `moveTerrain`, `moRange` — `getAvailableHexes()` |
| Sail | ✅ | `moveTerrain`, `moRange` |
| Navy | ✅ | `moveTerrain`, `moRange` |
| Air | ✅ | `ignoresObstacles` — `getAvailableHexes()` |
| Sneak | ❌ | `ignoresEnemyZone` нигде не читается |
| Steer | ❌ | `turnTakesAction` нигде не читается |
| Glide | ❌ | `blockFlee` нигде не читается (хотя `moRange *= 2` отрабатывает) |

## Combat (`combatModules.js`)

| Модуль | Статус | Где читается |
|---|---|---|
| Charge | ⚠️ | НЕ через `unit.canCharge`. Через `hasModule('Charge')` в `unitFlags.js`, `gameStateMachine.js`, `aiManager.js` |
| Flee | ⚠️ | НЕ через `unit.canFlee`. Через `hasModule('Flee')` в тех же трёх местах + `combatLogic.js` |
| Percy | ⚠️ | НЕ через `unit.attackOnKill`. Через `hasModule('Percy')` в тех же местах |
| Corrupt | ⚠️ | НЕ через `unit.onHitEffects`. Через `hasModule(attacker,'Corrupt')` в `combatLogic.js`, пишет в `target.status` |
| Surge | ⚠️ | НЕ через `unit.freezeOnHit`. Аналогично Corrupt, через `target.status` |
| Seize | ❌ | `unit.specialAttack` нигде не читается |
| Blast | ❌ | `unit.abilities.push('explode')` нигде не читается (есть `hasExplosionAbility` флаг в `unitFlags.js`, тоже не читается дальше) |
| Hard | ❌ | `unit.defenseBonus` нигде не читается |
| Restore | ❌ | `unit.abilities.push('healNearby')` нигде не читается |
| Splash | ❌ | `unit.splashDamage` нигде не читается |
| Stealth | ❌ | `unit.invisible` нигде не читается |
| Still | ⚠️ | `unitFlags.js` ставит `disableOwnRetaliation`, но и это никем не читается дальше — фактически ❌ |
| Ambush | ⚠️ | `unitFlags.js` ставит `preventEnemyRetaliation`, никем не читается дальше — фактически ❌ |
| Stomp | ❌ | `unit.stompOnMove` нигде не читается |
| Field | ❌ | `unit.fieldDamageAura` нигде не читается |
| Invade | ❌ | `unit.invadeCity` нигде не читается |

## Support (`supportModules.js`)

Все модули ❌ — `canCarry`, `canDrench`, `freezeOnMove`,
`abilities.push('boost')`, `independent`, `exploreBoost` нигде не
читаются вне файла объявления.

## Progression (`progressionModules.js`)

Все модули ❌ — `fuelTurns`, `absorbKill`, `evolutionStage`,
`disableVeterancy`, `canDrop` нигде не читаются вне файла объявления.

## Итог

8 из ~35 модулей (Dual, Sail, Navy, Air, Charge, Flee, Percy, плюс
частично Corrupt/Surge через отдельный механизм) реально влияют на
геймплей. Остальные ~27 — описаны в реестре, выставляют флаг на
юните, но ни один файл игровой логики этот флаг не проверяет.

`unitActingActions.js` (мёртвый файл, см. AGENTS.md) содержит частичный
список того, что планировалось как "action"-модули (Boost, Explode,
Seize-захват, Invade) — полезно как чек-лист при будущей реализации.
