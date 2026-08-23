# AGENTS.md — правила работы с проектом 4XTakeTwo

Этот файл — база. Меняется редко, только когда меняется сама архитектура
или правила работы. Если факт верен только "по состоянию на сегодня" —
ему место в `docs/sessions/`, не здесь.

> **TODO (зафиксировано 2026-06-17, отложено на следующую сессию):**
> §2 и §3 ниже сейчас смешивают стабильные правила со снимком текущего
> состояния кода (граф импортов, список мёртвых файлов, таблица
> модулей) — это дублирует `docs/architecture.md`/`docs/content-status.md`
> почти текстуально. Риск: при правке кода (например, если подключат
> `pathfinding.js`) придётся синхронно править оба места, иначе будет
> рассинхрон — та же проблема, которую этот документ критикует у
> Percy/Flee/Charge. Следующая сессия: вынести всё состояние-специфичное
> из §2/§3 в `architecture.md`/`content-status.md`, оставив здесь только
> короткую ссылку "см. docs/architecture.md" и сам принцип (зачем такая
> карта нужна), без деталей. Не делать это автоматически без явного
> запроса пользователя — решение отложено осознанно.

## 0. Источник истины — порядок приоритета

1. **Содержимое файлов на диске.** Не прошлые рекапы, не changelog, не
   этот документ. Если описание поведения файла противоречит самому
   файлу — файл прав, документ нужно исправить.
2. **`git log`** — для понимания *почему* код выглядит так, как выглядит.
   У проекта длинная история (60+ коммитов, с июня 2025). Решения вроде
   "почему AI не на behavior tree" объясняются не текущим состоянием
   файлов, а commit message вида "замена на логику трайбс". Перед тем
   как называть что-то недоделкой — смотри `git log --oneline`, возможно
   это сознательный откат, а не забытое.
3. **`docs/architecture.md`** — карта живых/мёртвых путей выполнения,
   обновляется по факту изменений в коде.
4. **`docs/sessions/*.md`** — история решений по датам. Никогда не
   перезаписывается задним числом.

Никогда не доверяй описанию кода в старом тексте/скриншоте/чужом аудите
без проверки по реальным файлам. Расхождения между "что написано в
рекапе" и "что в коде" — это нормально, это означает что рекап устарел.

## 1. Как я работаю в этом чате (не Claude Code)

Это веб/мобильный чат без памяти между сессиями. В начале каждой сессии
я получаю zip проекта и работаю с ним как с единственным источником.
По завершении работы:

- **Отдаю только изменённые или новые файлы по отдельности**, не весь
  проект как zip. Пользователь сам раскладывает их по дереву реального
  репозитория и коммитит.
- Перед выдачей — обновляю `docs/sessions/<дата>-sessionN.md` с тем, что
  сделано и почему (см. формат ниже), и `docs/architecture.md` /
  `docs/content-status.md`, если что-то из них стало неактуальным.
- Если в zip есть `AGENTS.md` — это не читается автоматически, я должен
  сам решить открыть его при просмотре дерева проекта в начале сессии.

## 2. Граф живых путей выполнения (сверено с zip 2026-06-17, обновлено 2026-06-18 сессией 3)

Это самое важное знание для не-блуждания по мёртвому коду. Проверяй
актуальность граф через `grep -rln "ИмяФункции" src` от точки входа —
если импортов нет, путь мёртв, независимо от того, насколько готовым
выглядит код.

### Игровой цикл (живой)
```
index.html → core/game.js (DOMContentLoaded)
  → ui/setup.js (меню, заполняется из scenarioConfigs + mapProfiles)
  → core/game.js:startGame() → initGame()
      → scenarios/scenarios.js → {dominator|conqueror}.generateMap()
      → utils/generateMapByProfile.js → utils/islandBuilder.js
      → utils/initMapIndex.js → state.mapIndex
      → scenarios/dominator.js:getInitialCapturePoints() → state.capturePoints (сессия 4)
      → mechanics/units.js:generateUnits()
  → ui/events.js:setupEventListeners()
      → handleCanvasClick() → mechanics/units.js (selectUnit, moveTo) | core/combatLogic.js:performAttack()
      → handleEndTurn()
          → core/captureLogic.js:updateCapturePoints()
          → core/aviationLogic.js:processAviationTurn(state, 'player1')  [сессия 6]
          → state.nextTurn() → runAISequence()
              (цикл while isAITurn():
                resetUnitsForPlayer(currentAI)
                → core/aviationLogic.js:processAviationTurn(state, currentAI)  [сессия 6]
                → ai/aiManager.js:runAIForTurn(currentAI))
              → ai/fsm/strategyFSM.js (всегда state='attack')
                  → ai/fsm/states/attackState.js
                      execute(executeCallback) [Шаг A, сессия 5]: per-unit:
                        1. пересчёт liveTargets (getAttackDamage≠null) [сессия 6]
                        2. decideAction() → scoreTarget():
                             +50 player1, +target.dangerScore [сессия 6],
                             +(1-hpPercent)×30, +40 kill (getAttackDamage) [сессия 6],
                             -1×dist, -30 если hp≤1,
                             Шаг B -60 если контратака убивает [сессия 6]
                        3. executeCallback(action) сразу [Шаг A]
                      → bestStepToward() → mechanics/pathfinding.js:findPath() (сессия 3)
                      → decideCaptureAction() конкурирует через cpScore (сессия 5)
              → executeAction() — Charge/Flee/Percy цепочка
                  → core/combatLogic.js:performAttack() → getAttackDamage() [сессия 6]
                  → findSafeHex() — Flee (сессия 4)
              → core/captureLogic.js:updateCapturePoints() → state.nextTurn()
  → ui/events.js:redraw() → ui/render.js (renderMap + renderUnits + drawCapturePoint)
```

### Мёртвый код — НЕ ИМПОРТИРУЕТСЯ из живого пути (проверено grep на 2026-06-17)

Появился в коммитах `eca6383`→`e1e9649` ("transfer to the Tribes model"),
когда удалялась behavior-tree архитектура и параллельно создавался этот
каркас "на будущее". Коммит `c34f0df` (текущий HEAD) сам признаёт:
"все еще все не подключено".

- `ai/actions/*.js` (attackActions, moveActions, captureActions,
  economicActions) — generic-заготовки, не привязаны к реальной модели
  юнита/карты. `economicActions.js` концептуально не про гекс-карту:
  абстрактные trade/investment без q,r,s.
- `ai/evaluators/*.js` (targetEvaluator, threatEvaluator, unitEvaluator,
  economyEvaluator) — `targetEvaluator.js` буквально не про игру, это
  generic goal-tracker (addGoal/criteria/metrics).
- `ai/fsm/states/{defend,economy,expand,idle}State.js` — `strategyFSM.js`
  навсегда стоит в `currentState='attack'`, эти файлы не импортирует.
- `ai/fsm/stateMachine.js` + `ai/fsm/transitions.js` — параллельный,
  более общий FSM-движок с готовой (и разумной) логикой переходов
  war/peace по числу юнитов. Не подключён к `aiManager.js`. Если решено
  доделывать многослойный AI — это стартовая точка, не с нуля.
- `core/_turnQueue.js` — заменён `state.turnOrder`. Не импортируется.
- `core/unitActingActions.js` (`runActingAction`) — не вызывается, но
  полезен как чек-лист нереализованных абилок: Boost, Explode,
  Seize-capture, Invade.
- `world/fogOfWar.js` — пустой файл.
- `ui/input.js` — пустой файл. Критично для Telegram WebApp: сейчас
  управление только через mouse events (`mousedown`/`wheel`/`click` в
  `game.js`/`events.js`), на мобильном клиенте Telegram нет touch.
- `utils/getTileFast.js` — дублирует `getTileFast` из `world/map.js`.
  Оба не используются: `units.js`/`lineOfSight.js` читают
  `state.mapIndex` напрямую.

### Технический долг (работает, но грязно)

- `cubeRound` (`world/map.js`) и `hexRound` (`mechanics/hexUtils.js`) —
  идентичная формула округления кубических координат в двух файлах.
- Percy/Flee/Charge цепочка реализована в трёх местах одновременно:
  `core/combatLogic.js:performAttack()`,
  `core/gameStateMachine.js:evaluatePostAction()`,
  `ai/aiManager.js:executeAction()`. Работает, но риск рассинхрона при
  правке одного места без остальных.
- `core/combatLogic.js`: `console.log` после `return` в `canAttack()`,
  ссылается на неопределённую переменную `unit`. Не выполняется, но
  убрать при следующей правке файла.
- `ui/render.js`: `renderMap()` сама вызывает `renderUnits()` в конце, а
  `events.js:redraw()` зовёт оба явно — юниты рисуются два раза подряд
  на каждый redraw. Не баг по эффекту, лишняя работа.
- `mechanics/pathfinding.js:findPath()` логирует `console.log` на КАЖДЫЙ
  вызов. С сессии 3 вызывается на каждом ходу каждого AI-юнита без LoS
  на цель — заметно зашумляет консоль по сравнению с прежним редким
  использованием. Отложено почистить по прямому запросу пользователя.

### Реальные баги

- **`weType`-массив** — **ИСПРАВЛЕНО сессией 4.** `units.js` конструктор
  теперь итерирует по всем ключам `weType`, берёт `Math.max` из range.
  WCC получает `atRange=6`. См. `docs/known-issues.md` #21 (закрыт).
- **LoS на границе двух гексов** — **ИСПРАВЛЕНО сессией 4.**
  `hexUtils.js` добавлены `hexRoundDual`/`getHexLineDual`; шаг на стыке
  блокирует LoS только если ОБА кандидата — блокирующий террейн.
  `lineOfSight.js` использует `getHexLineDual`. См. `#24` (закрыт).
- **`dangerScore`/`atDamage` авиации** — **ИСПРАВЛЕНО сессией 6.**
  `dangerScore` добавлен всем юнитам в `classTemplates.js`; `atDamage`
  добавлен ADB/ATB/AAF; WDD получил `Torp` в weType. `scoreTarget`
  заменил хардкод на `target.dangerScore`. См. `#27` (закрыт).
- Авиация (AAF/ADB/ATB) не двигается — нет `modules: ['Air']` в шаблонах,
  `getAvailableHexes()` возвращает []. Дальнобойное оружие позволяет
  атаковать без перемещения. Открыто.
- Новые классы кораблей (WSB, WCA, WLC, WSS, AAF, ADB, ATB) рисуются
  одинаковым кругом в `drawUnit()` — визуально неотличимы друг от друга.
  См. `#18` (открыт).

## 3. Контент опережает реализацию — статус системы модулей

В `core/modules/allModulesRegistry.js` задекларировано ~35 модулей.
Реально влияют на геймплей — **8**:

- `Dual`/`Sail`/`Navy`/`Air` — меняют `moveTerrain`/`moRange`/
  `ignoresObstacles`, реально читаемые поля.
- `Charge`/`Flee`/`Percy` — но НЕ через свой `effect()`. Поведение
  задаётся отдельным механизмом: прямой строковой проверкой
  `unit.hasModule('Charge')` в `combatLogic.js`/`gameStateMachine.js`/
  `aiManager.js`. Собственные флаги этих модулей (`canCharge`, `canFlee`,
  `attackOnKill` из `combatModules.js`) нигде не читаются — мёртвые.
  (Сессия 8: второй параллельный слой флагов, `core/unitFlags.js`,
  который дублировал и местами противоречил этому списку, удалён —
  `hasModule()` теперь единственный канонический способ проверки.)
- `Corrupt`/`Surge` — через `target.status` массив в `combatLogic.js`,
  тоже не через свои `onHitEffects`/`freezeOnHit` флаги.

Все остальные модули (`Seize`, `Hard`, `Restore`, `Splash`, `Stealth`,
`Stomp`, `Field`, `Invade`, `Carry`, `Drench`, `Freeze`, `Prop`, `Indy`,
`Explore`, `Fuel`, `Absorb`, `Evolve`, `Stable`, `Drop`, `Sneak`,
`Steer`, `Glide`, `Blast`) выставляют флаг через `effect()`, но **ни
один код в проекте этот флаг не читает**. Полный список см. в
`docs/content-status.md` — актуализировать его при добавлении новых
модулей или реализации эффекта для существующих.

Перед тем как удивляться "почему модуль X не работает в игре" —
сначала проверь, в каком из двух механизмов он закодирован.

## 4. Definition of "done" для фичи/модуля

Фича считается готовой только если выполнены все три пункта:

1. Эффект реализован в коде, который реально читается игровым циклом
   (проверка: `grep -rln` от точки входа находит путь).
2. Есть способ проверить в реальном игровом цикле (ручной тест через
   `startGame()` в браузере достаточен, не обязательно автотест).
3. Нет мёртвых параллельных версий той же механики, оставленных рядом.

Если хотя бы один пункт не выполнен — фича в статусе STUB, и это нужно
явно писать в `docs/content-status.md`/`docs/architecture.md`, а не
оставлять как будто доделанную.

## 5. Соглашение об устаревших файлах

Если файл оставляется как заготовка/не используется — обязательно
верхний комментарий вида:
```js
// DEPRECATED: заменён state.js:turnOrder, см. docs/architecture.md
```
Имя файла с `_` в начале (как `_turnQueue.js`) — недостаточно явный
сигнал, легко потерять при общем листинге директории.

## 6. Известные баги — см. docs/known-issues.md

Не дублировать список здесь — там же отслеживается статус
открыт/закрыт по сессиям.

Формат — одна плоская таблица, без тематических разделов (математика/
AI/рендер/итд). Осознанное решение от 2026-06-17: при ~20 строках
разделы создают больше проблем, чем решают — многие баги затрагивают
сразу 2+ темы (пример: #2 "enemy idle" это одновременно AI, pathfinding
и генерация карты), и придётся либо дублировать запись, либо гадать
куда её отнести. Колонка "Файлы" уже даёт достаточную навигацию через
обычный поиск по файлу.

**Когда пересмотреть:** если таблица вырастет за ~40-50 строк и поиск
по ней реально станет проблемой — тогда вернуться к вопросу, но сначала
попробовать просто колонку `Тема`/`Tag` (одно слово, не разбивка на
секции) — это решает навигацию без риска "куда отнести баг на стыке тем".

## 6a. Decision log — пока часть sessions/*.md, не отдельный файл

Осознанное решение от 2026-06-17: решений пока недостаточно, чтобы
оправдать отдельный файл с тематическими разделами. Ключевые развилки
и их причины фиксируются в `docs/sessions/<дата>.md` каждой сессии
(см. формат в session-заметках — секция "Ключевые развилки и почему
решено так").

**Когда пересмотреть:** если стало трудно найти "почему мы решили X"
— то есть приходится перебирать несколько файлов sessions/ чтобы
вспомнить причину одного решения — заводить `docs/decisions.md`. Тогда
секции по теме (AI/баланс/рендер/контент) там уже будут оправданы,
т.к. отдельные решения длиннее и хуже сжимаются в таблицу, чем баги.

## 7. Стек

Vanilla JS ES6 modules, Canvas 2D, Python HTTP сервер для локальной
разработки. Целевая платформа — Telegram WebApp (важно для UI: должен
работать тач, не только мышь — см. `ui/input.js` в разделе мёртвого
кода выше).
