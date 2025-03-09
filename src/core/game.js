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



// 📌 Настройка управления маcштабированием с учётом курсора
function setupZoomControls() {
    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();

        // 🟢 Получаем координаты курсора
        const rect = canvas.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;

        // 🟡 Выбираем коэффициент зума (увеличение или уменьшение)
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

        // Вызываем основную функцию масштабирования
        applyZoom(zoomFactor, cursorX, cursorY);
    });
}

// 📌 Универсальная функция масштабирования
function applyZoom(zoomFactor, cursorX, cursorY) {
    // 🟢 Получаем текущие координаты курсора
    const rect = document.getElementById('game-canvas').getBoundingClientRect();
    cursorX = cursorX ?? rect.width / 2; // Если координаты не переданы, берём центр
    cursorY = cursorY ?? rect.height / 2;

    // 🔵 Переводим экранные координаты в мировые до зума
    const worldXBefore = (cursorX - offset.x) / scale;
    const worldYBefore = (cursorY - offset.y) / scale;

    // 🟡 Запоминаем старый масштаб и вычисляем новый
    const prevScale = scale;
    scale *= zoomFactor;

    // 📌 Обновляем смещение, чтобы точка под курсором оставалась на месте
    offset.x = cursorX - worldXBefore * scale;
    offset.y = cursorY - worldYBefore * scale;

    // 🔵 Пересчитываем мировые координаты после зума
    const worldXAfter = (cursorX - offset.x) / scale;
    const worldYAfter = (cursorY - offset.y) / scale;

    // 🛠️ Логирование для отладки
    console.log(`🟢 Cursor - cursorX: ${cursorX}, cursorY: ${cursorY}`);
    console.log(`🔵 World BEFORE - worldX: ${worldXBefore.toFixed(2)}, worldY: ${worldYBefore.toFixed(2)}`);
    console.log(`🔄 Scaling - Old Scale: ${prevScale.toFixed(2)}, New Scale: ${scale.toFixed(2)}`);
    console.log(`📌 New Offset: (${offset.x.toFixed(2)}, ${offset.y.toFixed(2)})`);
    console.log(`🔵 World AFTER  - worldX: ${worldXAfter.toFixed(2)}, worldY: ${worldYAfter.toFixed(2)}`);

    // 🔄 Перерисовываем карту
    requestAnimationFrame(() => {
        renderMap(scale, offset);
        renderUnits(scale, offset);
    });
}

// 📌 Обновленные функции увеличения и уменьшения масштаба
function zoomIn(cursorX, cursorY) {
    applyZoom(1.1, cursorX, cursorY);
}

function zoomOut(cursorX, cursorY) {
    applyZoom(0.9, cursorX, cursorY);
}






// 📌 Настройка управления перетаскиванием
function setupDragControls() {
    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 2) { // Только ПКМ
            isDragging = true;

            // Запоминаем начальную позицию курсора относительно текущего смещения
            dragStart.x = event.clientX - mapOffsetX;
            dragStart.y = event.clientY - mapOffsetY;
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isDragging) {
            // Вычисляем новое смещение относительно начальной точки
            offset.x = event.clientX - dragStart.x;
            offset.y = event.clientY - dragStart.y;

            // Теперь mapOffsetX/Y тоже обновляются в реальном времени
            mapOffsetX = offset.x;
            mapOffsetY = offset.y;

            // Перерисовываем карту
            requestAnimationFrame(() => {
                renderMap(scale, offset);
                renderUnits(scale, offset);
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
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;

export { state, mapOffsetX, mapOffsetY };
