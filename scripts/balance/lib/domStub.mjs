// scripts/balance/lib/domStub.mjs
//
// Минимальный DOM-стаб через Proxy — тот же паттерн, что dom_stub.mjs в
// прошлых (не закоммиченных) сессиях (docs/sessions/2026-09-12-session10.md).
// Нужен не из-за top-level document/window обращений (их нет ни в одном
// модуле AI/боевой цепочки — проверено чтением исходников), а потому что
// RUNTIME-путь через Unit.moveTo() → gameStateMachine.js:evaluatePostAction()
// → highlightManager.js:clearMoveHighlights() → render.js:renderMap()/
// renderUnits() реально вызывает document.getElementById('game-canvas')
// на каждое движение юнита (подтверждено смоук-тестом харнеса — упало
// именно тут при первом же ходе AI).
//
// Подход: один Proxy, обёрнутый вокруг no-op функции, который на ЛЮБОЕ
// обращение к свойству/методу возвращает САМ СЕБЯ (и вызываем как функцию —
// тоже возвращает себя). Это покрывает весь canvas 2D API (ctx.save(),
// ctx.translate(), ctx.fillRect(), цепочки ctx.foo.bar() и т.д.) без
// перечисления конкретных методов — если рендер-код когда-нибудь начнёт
// использовать новый метод canvas API, стаб не потребует правки.
function createAutoProxy() {
  const target = function () {};
  const handler = {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === 'width' || prop === 'height' || prop === 'clientWidth' || prop === 'clientHeight') return 800;
      return autoProxy;
    },
    set() { return true; },
    apply() { return autoProxy; },
  };
  const autoProxy = new Proxy(target, handler);
  return autoProxy;
}

export function installDomStub() {
  if (globalThis.document && globalThis.document.__isBalanceDomStub) return; // идемпотентно

  const autoProxy = createAutoProxy();
  const fakeDocument = createAutoProxy();
  fakeDocument.__isBalanceDomStub = true; // no-op set по трапу выше, но флаг проверяем через сам объект ниже

  // Прямые присваивания вместо полагания на Proxy.set (он ничего не хранит) —
  // getElementById/addEventListener должны быть настоящими функциями с
  // предсказуемым возвратом, остальное покрывает автоprox.
  const realDocument = {
    __isBalanceDomStub: true,
    getElementById: () => autoProxy,
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => autoProxy,
    body: autoProxy,
  };
  const realWindow = {
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    innerWidth: 1920,
    innerHeight: 1080,
  };

  globalThis.document = new Proxy(realDocument, {
    get(t, prop) { return prop in t ? t[prop] : autoProxy; },
  });
  globalThis.window = new Proxy(realWindow, {
    get(t, prop) { return prop in t ? t[prop] : autoProxy; },
  });
}
