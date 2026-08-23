# Архитектура — живая карта

Обновляется по факту изменений в коде. Если этот документ противоречит
коду — прав код, документ нужно поправить в той же сессии, где найдено
расхождение.

Последняя сверка с кодом: 2026-06-17 (сессия 2). Обновлено сессиями 3-6
(2026-06-18/21): добавлены capture points, исправлены баги weType/#24/
#25/#26/#27, обновлён Flee, улучшен AI scoring, добавлена система
damageVs/targetClass, авиационная механика, флит 5v5 в dominator.

**Сверено и дополнено сессией 8 (2026-08-22/23)** — см. подробности в
`docs/sessions/2026-08-23-session8.md`: allegiance-матрица (диплома­тия
вместо хардкода player1), настоящая ATK/DEF-формула боя Polytopia
(заменяет часть описания damageVs ниже), контратаки, Step C
(симулированный обмен в AI), консолидация системы модулей (`unitFlags.js`
удалён), баланс WBB. Сессия 7 (авиация/ветеранство/win-lose/ASP) тоже
пропущена в этом документе до сессии 8 — читать `docs/sessions/
2026-06-22-session7.md` и `2026-08-23-session8.md` как источник правды
там, где они расходятся с этим файлом.

## Структура каталогов

```
src/
├── core/           — состояние игры, боевая логика, модули юнитов, FSM игры
│   ├── captureLogic.js  — updateCapturePoints(), вызывается из events.js (сессия 4)
│   ├── aviationLogic.js — processAviationTurn() + resetAviationState() (сессия 6)
│   └── modules/    — реестр модулей (combat/navigation/progression/support)
├── ai/             — AI-игроки
│   ├── aiManager.js, fsm/strategyFSM.js, fsm/states/attackState.js  — ЖИВОЙ путь
│   ├── actions/, evaluators/, fsm/states/{defend,economy,expand,idle}, fsm/stateMachine.js, fsm/transitions.js — МЁРТВЫЙ путь
├── mechanics/      — юниты, LoS, pathfinding (A*), hex-математика
├── scenarios/      — dominator (рабочий), conqueror (сломан, см. known-issues)
├── ui/             — рендер, события, меню; ui/input.js пустой (touch не реализован)
├── utils/          — генерация карты, спаун, индекс карты
└── world/          — гекс-математика, fogOfWar.js (пустой)
```

## Игровой цикл — последовательность вызовов

```
DOMContentLoaded (core/game.js)
  └─ setupUI() [ui/setup.js] — заполняет меню из scenarioConfigs + mapProfiles
       (включая conqueror, хотя он сломан — см. known-issues #3)
  └─ startGame(size, scenarioId, enemyCount, mapType)
       └─ initGame()
            ├─ generateScenario() → scenario.generateMap()
            │    └─ generateMapByProfile() [utils/generateMapByProfile.js]
            │         └─ islandBuilder.js: generateZonalIslands, clusterizeTerrain,
            │            applyVerticalIslandGrowth, applyLandToHillFilter,
            │            applySurfRim, applyWaterToDeepFilter
            │            (использует map.js:getTile — НЕ mapIndex, это нормально:
            │             mapIndex ещё не создан на этом этапе)
            ├─ initMapIndex(map) → state.mapIndex  [O(1) lookup отныне]
            ├─ state.initTurnOrder(enemyCount)
            ├─ getInitialUnitsForScenario() → generateUnits()
            └─ initProgressionSystem(state) — подключает techTree.onUnlock,
                 но techTree.unlock() никем не вызывается — система без триггера

ui/events.js: handleCanvasClick()
  ├─ клик по чужому юниту в зоне атаки → combatLogic.js:performAttack()
  ├─ клик по своему юниту → selectUnit() [mechanics/units.js]
  └─ клик по гексу движения → unit.moveTo()

ui/events.js: handleEndTurn()
  └─ captureLogic.js:updateCapturePoints(state)  [сессия 4]
  └─ aviationLogic.js:processAviationTurn(state, 'player1')  [сессия 6]
       — тикает lifeTurns у авиаюнитов player1, WCA спаунит новый
  └─ state.nextTurn() → если isAITurn() → runAISequence()
       (цикл while isAITurn():
         resetUnitsForPlayer(currentAI)
         → aviationLogic.js:processAviationTurn(state, currentAI)  [сессия 6]
         → runAIForTurn(currentAI)
         → updateCapturePoints → nextTurn)
       └─ ai/aiManager.js:runAIForTurn(state, owner)
            └─ StrategyFSM(state, owner).update()  [фиксированно state='attack']
                 └─ AttackState.execute(executeCallback)  [сессия 5: async]
                      [Шаг A, сессия 5]: per-unit цикл:
                        1. пересчёт liveTargets из gameState.units —
                           только цели которые getAttackDamage(unit,t) ≠ null [сессия 6]
                        2. decideAction(unit, liveTargets)
                             → scoreTarget() [сессия 8, полностью переписан]:
                                 -getAllegiance(unit.owner, target.owner)
                                   [diplomacy.js — заменяет старый хардкод +50 player1],
                                 +target.dangerScore,
                                 +(1-hpPercent)×30,
                                 -1×dist, -30 если unit.hp≤1,
                                 Шаг C: +tradeValue(unit,target,simulateAttack(...))
                                   [combatSimulator.js — заменяет старые хардкод-пороги
                                    "+40 если килл" и "Шаг B: -60 если сами умираем";
                                    tradeValue пропорционален dangerScore обеих сторон,
                                    не плоская константа]
                             → attack | move (bestStepWithLoS / bestStepToward с
                               optimalRange=atRange-1 [сессия 5]) | CP-move | idle
                             → decideCaptureAction() конкурирует с атакой
                               через cpScore [сессия 5]
                        3. await executeCallback(action) — применяем СРАЗУ,
                           до решения следующего юнита [Шаг A]
            └─ aiManager.js:executeAction() — Charge→Flee/Percy цепочка
                 combatLogic.js:performAttack() использует getAttackDamage() [сессия 6]
                 Flee: findSafeHex() [сессия 4]
  └─ redraw() [ui/events.js] → renderMap() + renderUnits() + drawCapturePoint() [ui/render.js]
       (примечание: renderMap() сама тоже зовёт renderUnits() внутри —
        двойная отрисовка юнитов на каждый redraw, не критично)
```

## Победные условия — подключены (сессия 7, закрыто #1/#1a)

`scenarios/dominator.js` экспортирует `winCondition(state)`/
`loseCondition(state)`, фильтрует по присутствию юнитов в `state.units`
(мёртвые физически удаляются `splice()` в `combatLogic.js`, поле `u.alive`
не существует и не используется — старый баг закрыт). `ui/events.js:
checkEndConditions()` проверяет оба условия после атаки игрока и после
каждого хода AI в `runAISequence`; при срабатывании — `state.gameOver =
true` + `alert(...)`, `handleCanvasClick`/`handleEndTurn` блокируются пока
`state.gameOver`. Пока только `alert` — нет UI-оверлея и автовозврата в
меню (см. известные проблемы).

`conqueror.js` тоже экспортирует свои `winCondition`/`loseCondition`, но
сценарий сломан по другой причине (см. таблицу сценариев ниже) — условия
победы там формально есть, но опираются на `turnCount`/`controlledBy`,
которые никогда не устанавливаются.

## Система модулей — effect() существует отдельно от реальной проверки

См. подробный список в AGENTS.md §3 и в `docs/content-status.md`.
Короткая версия: `effect()` в реестре модулей выставляет флаги на юните
(`unit.canCharge`, `unit.attackOnKill` и т.д.), но реальная боевая логика
(`hasModule()` проверки в `combatLogic.js`/`gameStateMachine.js`/
`aiManager.js`) читает не эти флаги, а сам факт наличия модуля в
`unit.modules` напрямую. **Сессия 8**: убран второй параллельный слой
флагов (`core/unitFlags.js`, удалён), который дублировал `effect()` и
местами ей противоречил (`Still`/`Ambush` означали разное в двух
системах) — теперь `hasModule()` единственный канонический способ.
Совпадают по смыслу с `effect()` только terrain-модули
(Dual/Sail/Navy/Air) и отчасти Charge/Flee/Percy.

## Сценарии

| Сценарий | Статус | Причина |
|---|---|---|
| `dominator` | Рабочий (с поправкой на отсутствие вызова winCondition выше) | Симметричный флит FLEET=[WDD×2, WCC×2, WBB] для каждого игрока [сессия 6, ранее 2 player1 vs 1 случайный AI] |
| `conqueror` | Сломан полностью | `reef`/`zone` террейны генерируются, но не рендерятся (`getTerrainColor` не знает их), не участвуют в движении/спауне. `turnCount` и `controlledBy`, на которых строится win/lose, нигде не инкрементируются/устанавливаются |

## Capture points (добавлено сессией 4)

`state.capturePoints[]` — массив `{q, r, s, owner, claimant, claimTurns}`.

Генерация: `dominator.getInitialCapturePoints(mapIndex, count=3)` выбирает
случайные land-гексы с расстоянием ≥5 друг от друга. Вызывается из
`game.js:initGame()` после `initMapIndex`.

Захват: `captureLogic.js:updateCapturePoints(state)` вызывается перед
каждым `state.nextTurn()` (и в `handleEndTurn`, и в `runAISequence`).
Логика: найти юнитов в `hexDistance ≤ 3`; если 1 владелец без оппонента →
`claimTurns++`; при `claimTurns ≥ 2` → `owner = claimant`. Любое отсутствие
или оспаривание → `claimTurns = 0`.

Рендер: `drawCapturePoint()` в `render.js` — алмаз цветом `owner` (серый
если `null`) + дуга прогресса `claimTurns/2` цветом `claimant`.

AI: `decideCaptureAction()` в `attackState.js` — конкурирует с атакой
через `cpScore` в одной шкале [сессия 5, ранее был только fallback];
`findSafeHex()` в `aiManager.js` — Flee идёт к CP если не умирает.

**Что пока НЕ реализовано:**
- Win condition через CP (игра по-прежнему без конца, #1 открыт)
- `findPath` к land-гексу CP недостижим для морских юнитов → срабатывает
  жадный fallback в `bestStepToward` (работает, но не оптимально — юнит
  приближается по прямой, может застрять у берега)
- Focus fire / deconfliction целей — несколько юнитов не координируют кого бить

## Боевая формула — ATK/DEF/HP% настоящей Polytopia (сессия 8, заменяет старую damageVs-only модель)

Источник — `polytopia.fandom.com/wiki/Combat`, реализовано дословно
(акселератор **4.5** подтверждён первоисточником):

```
attackForce  = effectiveATK × (attacker.hp / attacker.maxHp)
defenseForce = target.def × (target.hp / target.maxHp) × defenseBonus(=1, не реализован)
attackResult  = round((attackForce/(attackForce+defenseForce)) × effectiveATK × 4.5)
defenseResult = round((defenseForce/(attackForce+defenseForce)) × target.def × 4.5)
```

`effectiveATK = unit.atDamage × weaponTypes[оружие].damageVs[target.targetClass]`
— каждый юнит имеет `targetClass: 'surface'|'air'|'sub'`
(`classTemplates.js`), каждое оружие в `weaponTypes.js` имеет
`damageVs: {surface,air,sub}` **множители** (не абсолютный урон).
Отсутствие ключа = оружие физически не может выбрать этот класс
(`null`, не 0). Из нескольких `weType` берётся максимум эффективного ATK
— `getEffectiveAttack()` в `combatLogic.js`.

Текущая матрица множителей:

| Оружие | дальность | surface | air | sub |
|--------|---|---------|-----|-----|
| Main   | 6 | ×1.0    | —   | —   |
| Torp   | 7 | ×1.0    | —   | ×1.0 |
| Small  | 6 | ×1.0    | ×0.5 | —  |
| DC     | 3 | —       | —   | ×1.0 |

`unit.def` — новое поле (сессия 8), дефолт = `atDamage` (симметрично);
единственное явное переопределение сейчас — WBB (`def:5` > `atDamage:3`,
танк). См. `docs/ai-design-notes-tribes.md` для полного баланс-бэклога
(Torp дальность, AAF отдельное оружие, ADB/ATB понижение и т.д. —
продумано, не вписано в код).

**Контратака** (`getCounterDamage`) — та же формула, но считается ДО
применения основного урона (обе стороны — HP на старте обмена, не
"цель уже подранена значит отвечает слабее"). `noCounter` (только
AAF/ADB/ATB) — Surprise-эквивалент реальной Polytopia (атакующий не
получает ответку); Stiff-эквивалент (защитник никогда не отвечает,
независимо от того кто атакует) не заведён.

Используется в: `combatLogic.js:performAttack()` (фактический урон +
контратака), `attackState.js:execute()` (фильтр liveTargets),
`attackState.js:scoreTarget()` (Шаг C, `combatSimulator.js`),
`units.js:getAttackableHexes()` (подсветка целей UI).

## Авиация (добавлено сессией 6)

`src/core/aviationLogic.js`:
- `processAviationTurn(state, owner)`: (1) декрементирует `lifeTurns`
  у авиаюнитов owner, удаляет выработавших; (2) если жив WCA и
  `aviationCount < MAX_AVIATION(4)` — спаунит следующий тип из цикла
  `ATB→ADB→AAF→ATB→...` на свободный соседний гекс WCA.
- `resetAviationState()`: сбрасывает `spawnCycle` Map (вызывается из
  `aiManager.js:resetAIState()`).

`noCounter: true` на AAF/ADB/ATB — **реализовано сессией 8**, см. раздел
про боевую формулу выше (`getCounterDamage` учитывает флаг).
`modules: ['Air']` у AAF/ADB/ATB — **добавлено сессией 7** (было
известным багом, авиация не могла двигаться; теперь `ignoresObstacles`
выставляется, `getAvailableHexes()` работает нормально).

## Туман войны (добавлено сессией 9)

`src/world/fogOfWar.js` — per-owner, два Set-а в `state.fog[owner]`:
`explored` (накопительный, никогда не уменьшается — террейн, который увидел
хоть раз, виден игроку навсегда) и `visible` (полностью пересчитывается на
каждый `updateVisibility(state, owner)` — живая видимость юнитов ПРЯМО
СЕЙЧАС, от позиций живых юнитов этого owner'а в радиусе их `viRange`).
Ключ гекса — строка `"q,r,s"`, тот же формат, что `state.mapIndex`.

Карта (`state.mapIndex`) туманом не накрывается вообще — известна целиком
с начала партии всем, включая pathfinding/AI. Скрыто только: (1) для
рендера — террейн игрока вне `explored`, вражеские юниты вне `visible`;
(2) для AI-таргетинга — вражеские юниты вне `visible` конкретного owner'а.

Пересчёт:
- `player1` — в `ui/events.js:redraw()`, единая точка после любого действия
  (независимо от того, чей ход — это всегда взгляд игрока, не участника
  хода).
- Каждый AI — в начале СВОЕГО хода (`runAISequence()`, сразу после
  `resetUnitsForPlayer(currentAI)`, до `runAIForTurn`). Не пересчитывается
  в реальном времени внутри одного хода AI (если юнит A продвинулся и
  открыл новый гекс, юнит B в этом же ходу этого ещё не увидит — известное
  упрощение, при необходимости пересчёт можно перенести внутрь
  `AttackState.execute()`).

AI получает `AI_VISION_BONUS = +2` к эффективному `viRange` (только для
тумана, не для боя/`atRange`) — без него AI не видит противника дальше
собственного радиуса обзора юнитов и превращается в дрейфующий флот, а не
в challenge. Единственная тюнинговая ручка сложности, один флаг в
`fogOfWar.js`.

Подключено:
- `ui/render.js` — `renderMap()` не рисует террейн вне `explored`(player1),
  `renderUnits()` не рисует вражеский юнит вне `visible`(player1)
- `ai/fsm/states/attackState.js` — `liveTargets` дополнительно фильтруются
  по `isVisible(gameState, owner, ...)`
- `ai/aiManager.js:findBestTarget()` (Percy-добивание) — та же фильтрация

**Призраки последней позиции** — `updateVisibility()` попутно ведёт
`fog.ghosts` (hexKey → `{type, owner, q, r, s, ttl}`): когда вражеский
юнит, видимый на предыдущем пересчёте (`fog.lastKnownUnits`), пропадает из
`visible`, на его последней известной клетке появляется призрак. Погибший
вне видимости юнит призрака НЕ оставляет (owner не видел момента гибели).
Свежее наблюдение стирает устаревшего призрака той же клетки.

Важно про частоту вызовов: `updateVisibility(owner)` вызывается МНОГО раз
за один ход (у player1 — на каждый `redraw()`), поэтому старение `ttl`
вынесено в отдельную `expireGhosts(state, owner)`, которую вызывающий код
обязан звать РОВНО ОДИН РАЗ на старт хода owner'а (`runAISequence()` — на
старт хода каждого AI и при возврате к player1). Первая версия сессии 9
по ошибке старила `ttl` прямо внутри `updateVisibility()` — из-за частых
вызовов `redraw()` призрак истаивал за пару кликов внутри одного хода
вместо заявленного "хотя бы на ход"; исправлено разделением функций.
`GHOST_TTL=1` в `fogOfWar.js` — призрак переживает ровно один полный ход
owner'а. Рендер — `render.js:drawGhost()`, полупрозрачный пунктирный контур,
без HP (оно устарело в момент потери видимости).

**Найдено при первом визуальном тесте (сессия 9): WBB `viRange` был 100**
("радар на всю карту" — безобидно, пока поле нигде не читалось). Один WBB
всегда есть в стартовом флоте игрока (`dominator.js:FLEET`), поэтому с
подключённым `fogOfWar.js` он один сразу открывал всю карту (`size:10` по
умолчанию — максимум ~20 гексов от центра до края, куда меньше 100).
Снижено до `viRange:6` (совпадает с его же `atRange`, как у остальных
крупных юнитов). Если понадобится юнит-радар, открывающий много — заводить
осознанно с числом, реально сопоставимым с размером карты, не оставлять
плейсхолдер.

Подключено (найдено сессией 9 по факту визуального теста — подсветка
атаки светилась даже в тумане): `mechanics/units.js:getAttackableHexes()`
— единственное место, которое строит и список гексов для подсветки, и
список валидных целей для реального клика-атаки (`handleCanvasClick()` в
`ui/events.js` использует ровно эту же функцию для валидации). Один
фильтр `isVisible(state, unit.owner, ...)` в ней чинит оба случая сразу:
и подсветку, и саму возможность атаковать невидимого врага вслепую —
раньше не было гейта ни там, ни там, это была одна и та же дыра под
двумя разными проявлениями.

Осознанно НЕ подключено:
- `findSafeHex()`/threat-avoidance в `aiManager.js` — AI уклоняется от
  урона омниscient (видит угрозу для расчёта "как отступать", даже если
  формально не в `visible`). Осознанно оставлено — пользователь просил
  убрать именно "атаку из тумана", не всеведение при отступлении.
- `decideCaptureAction()` в `attackState.js` — точки захвата не гейтятся
  туманом, координаты известны AI с начала партии (как и весь `mapIndex`).

## Сериализация (savegame)

`core/savegame.js`: `saveGameState()` делает `JSON.stringify(state)` —
сериализует весь объект состояния целиком, включая потенциально большой
`mapIndex`. `loadGameState()` парсит JSON и **возвращает** объект, но
`game.js:loadGame()` никогда не применяет его к реальному `state`
(нет `Object.assign(state, loaded)` или аналога). Даже если бы
применялся — `JSON.parse` даёт plain objects, не экземпляры класса
`Unit`, то есть методы (`moveTo`, `hasModule`, и т.д.) потерялись бы.
Save практически работает (пишет в localStorage), load — не работает
вообще.

## История архитектурных решений AI (из git log)

Коммиты `eca6383` → `e1e9649` ("transfer to the Tribes model") — попытка
behavior-tree архитектуры (`SelectorNode`/`ConditionNode`/`ActionNode`,
деревья `attackWbb.js`/`defendWbb.js`), с интеграцией `pathfinding.js`
для движения AI. Коммит `c34f0df` ("замена на логику трайбс", текущий
HEAD) откатывает это обратно на FSM-подход, **сознательно**, с пометкой
в самом commit message: "все еще все не подключено". Параллельно при
этом откате были созданы текущие мёртвые файлы `ai/evaluators/*` и
`ai/fsm/states/{defend,economy,expand,idle}State.js` — это заготовки,
оставленные сознательно на будущее, не забытые случайно.

Вывод: если в будущем решено вернуться к многослойному AI (strategic/
tactical/execution, как описано в одной из дизайн-заметок), стартовая
точка — `ai/fsm/stateMachine.js` + `ai/fsm/transitions.js`, у них уже
есть рабочая логика переходов war/peace по соотношению численности
юнитов. Не начинать с нуля.

## TODO крупный (зафиксировано 2026-06-18, сессия 3) — pathfinding жёстко привязан к одной цели, нужен обобщённый слой "сканируй карту → выбери цель → найди путь"

Текущее состояние (после подключения `findPath` к `bestStepToward` в
этой сессии): AI уже умеет находить путь от юнита до ОДНОЙ заранее
выбранной цели (`scoreTarget` выбирает лучшую цель среди юнитов
`player1`, затем `findPath` строит маршрут конкретно к ней). Это решает
сегодняшнюю проблему (остров блокирует жадный шаг), но имеет
архитектурный потолок, на который пользователь указал явно:

**Проблема 1 — цели сейчас это только вражеские юниты.** Когда появятся
города/zone-клетки/ресурсы на карте (`conqueror.js` уже намекает на
это через `controlledBy`/`zone`, см. известную проблему #8), список
возможных целей перестанет быть однородным. Нужен слой, который
сканирует всю карту, собирает ВСЕ кандидаты на цель (вражеские юниты,
города, спорные зоны), оценивает каждый, и только потом для
выбранной лучшей цели вызывает `findPath`. Сейчас `AttackState.execute()`
уже частично это делает (`scoreTarget` по юнитам), но жёстко заточен
только под юниты-цели — расширение на города/зоны потребует обобщения
самого понятия "цель" (сейчас это просто `Unit`).

**Проблема 2 — Flee должен быть целенаправленным, не случайным отходом.**
**Частично решено сессией 4:** `findSafeHex` теперь считает входящий
урон; если не смертелен — идёт к ближайшей незахваченной CP вместо
случайного отхода. Нерешённое ниже. Пользователь предложил конкретную иерархию того, что
Flee МОГ бы делать вместо простого отхода, в порядке возрастания
сложности реализации:
  1. Отойти к ближайшему своему юниту/группе — для защиты (взаимная
     поддержка). Несложно: найти ближайший `owner === свой` юнит,
     `findPath` к нему, отойти в его сторону.
  2. Если после атаки в радиусе есть доступная для захвата
     цель/зона — пойти захватывать её вместо простого отхода. Требует
     капчур-механики, которой сейчас НЕТ в живом коде (только
     заготовка в мёртвом `unitActingActions.js`, см. известную
     проблему/чек-лист в `content-status.md`). Зависит от Проблемы 1.
  3. Отойти "за остров" — то есть выбрать отступление, которое
     одновременно использует препятствие как укрытие (блокирует LoS
     преследователя). Пользователь сам отметил это как сложную для
     реализации идею. Требует не просто `findPath` к точке, а оценки
     "какие гексы в радиусе отхода блокируют LoS от ближайшего
     врага" — это новый тип запроса, которого нет ни в `lineOfSight.js`,
     ни в `pathfinding.js` сейчас.

**Почему не делать это прямо сейчас:** обобщение "цель" с юнита до
любого объекта на карте, и тем более LoS-aware retreat — это
существенный объём дизайна (что считается целью, как сравнивать
ценность атаки vs захвата vs защиты в одной шкале), а не точечная
правка. Сделано осознанно поэтапно: сначала закрыт баг с движением
(остров), сложная логика выбора целей и осмысленного Flee — отдельная
сессия, когда будет ясность по городам/zone-механике.

**Когда возвращаться к этому:** как только в игре появится первая
не-юнитовая цель (город, ресурсная зона, что угодно захватываемое) —
тогда нужно проектировать обобщённый слой "сканирование карты →
список кандидатов на цель → scoring → findPath к выбранной", и
Flee/Charge/Percy логику переписывать поверх него, а не патчить
точечно как сейчас.
