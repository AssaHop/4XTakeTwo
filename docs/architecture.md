# Архитектура — живая карта

Обновляется по факту изменений в коде. Если этот документ противоречит
коду — прав код, документ нужно поправить в той же сессии, где найдено
расхождение.

Последняя сверка с кодом: 2026-06-17 (сессия 2). Точечно обновлено
сессиями 3-5 (2026-06-18/21): добавлены capture points, исправлены баги
weType/#24/#25/#26, обновлён Flee, улучшен AI scoring.
Остальной документ актуален на дату сессии 2.

## Структура каталогов

```
src/
├── core/           — состояние игры, боевая логика, модули юнитов, FSM игры
│   ├── captureLogic.js  — updateCapturePoints(), вызывается из events.js (сессия 4)
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
  └─ captureLogic.js:updateCapturePoints(state)  [сессия 4 — перед nextTurn]
  └─ state.nextTurn() → если isAITurn() → runAISequence()
       (цикл while isAITurn(): resetUnitsForPlayer → runAIForTurn → updateCapturePoints → nextTurn)
       └─ ai/aiManager.js:runAIForTurn(state, owner)
            └─ StrategyFSM(state, owner).update()  [фиксированно state='attack']
                 └─ AttackState.execute()
                      для каждого юнита owner: decideAction()
                        → scoreTarget() (вес +50 player1, dangerBonus WCC+25/
                          WDD+15/WBB+10, hpPercent-бонус, +40 если добивает,
                          -1×dist [было -3, сессия 5], -30 если сам почти мёртв)
                        → attack | move (bestStepWithLoS / bestStepToward с
                          optimalRange=atRange-1 [сессия 5]) | CP-move | idle
                        → decideCaptureAction() конкурирует с атакой в одной
                          шкале (cpScore vs best.score) [сессия 5, ранее fallback]
                          скор CP: +60 ничейная, +40 вражеская, +20 claimant,
                          -1.0×dist. Если cpScore > enemy score → идёт к CP.
            └─ aiManager.js:executeAction() — исполняет, включая Charge→Flee/Percy
                 цепочку. Flee: findSafeHex() — если incoming damage < unit.hp →
                 идёт к ближайшей незахваченной CP; иначе бежит от врагов [сессия 4]
  └─ redraw() [ui/events.js] → renderMap() + renderUnits() + drawCapturePoint() [ui/render.js]
       (примечание: renderMap() сама тоже зовёт renderUnits() внутри —
        двойная отрисовка юнитов на каждый redraw, не критично)
```

## Победные условия — определены, но не подключены

`scenarios/dominator.js` и `scenarios/conqueror.js` экспортируют
`winCondition(state)`/`loseCondition(state)`. **Ни один файл их не
импортирует.** `GameState.GAME_OVER` существует как enum-значение в
`core/gameStateMachine.js`, но `transitionTo(GameState.GAME_OVER)`
никогда не вызывается. Игра физически не может закончиться победой
или поражением сейчас — нужно добавить проверку после каждого
`redraw()` или после каждого `nextTurn()`.

Дополнительно у `dominator.winCondition`/`loseCondition` логическая
ошибка: фильтруют по `u.alive`, а у `Unit` такого поля нет (есть метод
`isAlive()`, либо просто факт присутствия в `state.units`, так как
мёртвые юниты физически удаляются `splice()` в `combatLogic.js`).
Из-за этого `enemies.length === 0` всегда true — нужно поправить
вместе с подключением.

## Система модулей — два независимых механизма кодирования эффекта

См. подробный список в AGENTS.md §3 и в `docs/content-status.md`.
Короткая версия: `effect()` в реестре модулей и реальная боевая логика
(`hasModule()` проверки в `combatLogic.js`/`gameStateMachine.js`/
`unitFlags.js`/`aiManager.js`) — это две разные, не связанные друг с
другом системы. Совпадают по смыслу только для terrain-модулей
(Dual/Sail/Navy/Air) и отчасти для Charge/Flee/Percy.

## Сценарии

| Сценарий | Статус | Причина |
|---|---|---|
| `dominator` | Рабочий (с поправкой на отсутствие вызова winCondition выше) | Спаун чередованием WBB/WDD/WCC, простая победа "убей всех" |
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
