import { generateHexMap } from '../world/map.js';
import { renderMap, renderUnits } from '../ui/render.js';
import { addUnit } from '../mechanics/units.js';
import { setupUI } from '../ui/setup.js';
import { setupEventListeners } from '../ui/events.js';
import { state } from '../core/state.js';

// Основные параметры
let scale = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let mapOffsetX = 0;
let mapOffsetY = 0;

// 📌 Центрирование карты
function updateMapOffset() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("❌ Canvas not found!");
        return;
    }

    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    mapOffsetX = canvas.width / 2;
    mapOffsetY = canvas.height / 2;
    offset.x = mapOffsetX;
    offset.y = mapOffsetY;
    console.log(`updateMapOffset - mapOffsetX: ${mapOffsetX}, mapOffsetY: ${mapOffsetY}`);
}

// 🖥️ Показываем меню
function showMenu() {
    document.getElementById('menu-container').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
}

// 🕹️ Запуск игры
function startGame(size) {
    document.getElementById('menu-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    initGame(size);
}

// 🔄 Инициализация игры
function initGame(size) {
    updateMapOffset();
    state.map = generateHexMap(size);

    if (!state.map || state.map.length === 0) {
        console.error('❌ Map generation failed');
        return;
    }

    renderMap(scale, offset);
    addUnit(0, 0, 0, 'soldier', 'player1');
    addUnit(1, -1, 0, 'archer', 'player2');
    renderUnits(scale, offset);
    setupEventListeners();
    console.log(`initGame - scale: ${scale}, offset.x: ${offset.x}, offset.y: ${offset.y}`);
}

// 📌 Устанавливаем `canvas`
function setupCanvas() {
    const canvas = document.getElementById('game-canvas');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    updateMapOffset();
    console.log(`setupCanvas - scale: ${scale}, offset.x: ${offset.x}, offset.y: ${offset.y}`);
}

// 📌 Обновление при изменении размера окна
window.addEventListener('resize', () => {
    setupCanvas();
    renderMap(scale, offset);
    renderUnits(scale, offset);
    console.log(`window resize - scale: ${scale}, offset.x: ${offset.x}, offset.y: ${offset.y}`);
});



// 📌 Настройка управления маcштабированием — колесо мыши
function setupZoomControls() {
    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();

        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

        // 🟢 Передаём координаты курсора в applyZoom
        applyZoom(zoomFactor, event.clientX, event.clientY);
    });
}

// 📌 Универсальная функция зума — учитывает курсор
function applyZoom(zoomFactor, cursorX, cursorY) {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();

    // 🔍 Преобразуем координаты курсора в локальные координаты внутри canvas
    const fixedX = cursorX - rect.left;
    const fixedY = cursorY - rect.top;

    // 📍 Мировые координаты до изменения масштаба
    const worldXBefore = (fixedX - state.offset.x) / state.scale;
    const worldYBefore = (fixedY - state.offset.y) / state.scale;

    // 🔄 Обновляем масштаб
    const prevScale = state.scale;
    state.scale *= zoomFactor;

    // 🧮 Перерасчёт offset так, чтобы курсор остался на той же мировой точке
    state.offset.x = fixedX - worldXBefore * state.scale;
    state.offset.y = fixedY - worldYBefore * state.scale;

    // console.log(`📐 applyZoom from cursor (${fixedX}, ${fixedY}) → scale ${prevScale.toFixed(3)} → ${state.scale.toFixed(3)}`);
    // console.log(`📦 New offset: (${state.offset.x.toFixed(2)}, ${state.offset.y.toFixed(2)})`);

    // 🔁 Перерисовываем всё
    requestAnimationFrame(() => {
        renderMap(state.scale, state.offset);
        renderUnits(state.scale, state.offset);
    });
}


// 📌 Настройка управления перетаскиванием
function setupDragControls() {
    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 2) { // Только ПКМ
            isDragging = true;

            // Запоминаем начальную позицию курсора относительно текущего смещения
            dragStart.x = event.clientX - state.offset.x;
            dragStart.y = event.clientY - state.offset.y;
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isDragging) {
            // Вычисляем новое смещение относительно начальной точки
            state.offset.x = event.clientX - dragStart.x;
            state.offset.y = event.clientY - dragStart.y;

            // Перерисовываем карту с сохранённым масштабом
            requestAnimationFrame(() => {
                renderMap(state.scale, state.offset);
                renderUnits(state.scale, state.offset);
            });
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Отключаем контекстное меню при ПКМ
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
}


// 🏁 Инициализация
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    window.requestAnimationFrame(() => {
        setupCanvas();
        showMenu();
        setupZoomControls();
        setupDragControls();
        startGame(2);
    });
});

// 📌 Глобальные функции
window.startGame = startGame;

export { state, scale, mapOffsetX, mapOffsetY };
