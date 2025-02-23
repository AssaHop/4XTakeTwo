let map = [];
const units = [];
let zoomLevel = 1;

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    showMenu();
    setupZoomListeners();
    
    // Текущая переменная squash-factor и расчет высоты гекса
    const rootStyles = getComputedStyle(document.documentElement);
    const squashFactor = parseFloat(rootStyles.getPropertyValue('--squash-factor'));
    const hexRadius = parseFloat(rootStyles.getPropertyValue('--hex-radius'));
    const hexHeight = squashFactor * Math.sqrt(3) * hexRadius;

    // Обновляем координаты для clip-path
    const topPercentage = 0; // Верхняя часть должна быть на уровне 0%
    const bottomPercentage = 100; // Нижняя часть должна быть на уровне 100%
    document.documentElement.style.setProperty('--hex-clip-top-left', `25% ${topPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-top-right', `75% ${topPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-bottom-right', `75% ${bottomPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-bottom-left', `25% ${bottomPercentage}%`);
});

function showMenu() {
    document.getElementById('menu-container').style.display = 'block';
    document.getElementById('zoom-container').style.display = 'none';
    document.getElementById('end-turn-button').style.display = 'none';
}

function startGame(size, squashFactor = 0.7) {
    document.getElementById('menu-container').style.display = 'none';
    document.getElementById('zoom-container').style.display = 'block';
    document.getElementById('end-turn-button').style.display = 'block';
    updateSquashFactor(squashFactor);
    initGame(size);
}

function updateSquashFactor(squashFactor) {
    document.documentElement.style.setProperty('--squash-factor', squashFactor);

    // Обновляем координаты для clip-path
    const topPercentage = 0; // Верхняя часть должна быть на уровне 0%
    const bottomPercentage = 100; // Нижняя часть должна быть на уровне 100%
    document.documentElement.style.setProperty('--hex-clip-top-left', `25% ${topPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-top-right', `75% ${topPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-bottom-right', `75% ${bottomPercentage}%`);
    document.documentElement.style.setProperty('--hex-clip-bottom-left', `25% ${bottomPercentage}%`);
}

function initGame(size) {
    map = generateMap(size); // Генерация карты с выбранным размером
    generateUnits(map, 3); // Создаем 3 юнита
    renderMap(map);
    renderUnits();
    setupEventListeners();
}

function endTurn() {
    units.forEach(unit => {
        unit.actions = 1; // Сбросить действия юнитов
        unit.selected = false; // Снять выделение с юнитов
        unit.checkState(); // Проверка состояния юнита перед началом хода
        unit.upgrade(); // Условное улучшение юнита
    });
    renderMap(map); // Перерисовать карту для снятия подсветки
    renderUnits();
    updateEndTurnButton(false); // Изменить цвет кнопки "Конец хода"
}

// Функция для генерации карты
function generateMap(size) {
    const map = [];
    for (let q = -size; q <= size; q++) {
        const rowArray = [];
        for (let r = -size; r <= size; r++) {
            if (Math.abs(q + r) <= size) {
                const cell = {
                    q: q,
                    r: r,
                    type: Math.random() > 0.2 ? 'walkable' : 'non-walkable'
                };
                rowArray.push(cell);
            }
        }
        map.push(rowArray);
    }
    return map;
}

// Функция для генерации юнитов
function generateUnits(map, numUnits) {
    units.length = 0;
    let generatedUnits = 0;
    while (generatedUnits < numUnits) {
        const q = Math.floor(Math.random() * (map.length * 2 + 1)) - map.length;
        const r = Math.floor(Math.random() * (map.length * 2 + 1)) - map.length;
        if (map[q + map.length] && map[q + map.length][r + map.length] && map[q + map.length][r + map.length].type === 'walkable' && !units.some(unit => unit.q === q && unit.r === r)) {
            const unit = new Unit(q, r, 'dd', 'player'); // 'player' - владелец юнита
            units.push(unit);
            generatedUnits++;
        }
    }
    renderUnits();
}

// Функция для рендеринга карты
function renderMap(map) {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';

    // Вычисляем смещение для центровки карты
    const offsetX = gameContainer.clientWidth / 2;
    const offsetY = gameContainer.clientHeight / 2;

    map.forEach(row => {
        row.forEach(cell => {
            const hex = document.createElement('div');
            hex.classList.add('hex', cell.type);
            const { x, y } = axialToPixel(cell.q, cell.r, offsetX, offsetY);
            hex.style.transform = `translate(${x}px, ${y}px)`;
            hex.dataset.q = cell.q;
            hex.dataset.r = cell.r;
            gameContainer.appendChild(hex);
        });
    });
}

// Функция для рендеринга юнитов
function renderUnits() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.querySelectorAll('.unit').forEach(el => el.remove());

    // Вычисляем смещение для центровки карты
    const offsetX = gameContainer.clientWidth / 2;
    const offsetY = gameContainer.clientHeight / 2;

    units.forEach(unit => {
        const unitElement = unit.render();
        const { x, y } = axialToPixel(unit.q, unit.r, offsetX, offsetY);
        unitElement.style.transform = `translate(${x}px, ${y}px)`;
        unitElement.dataset.id = unit.id;
        if (unit.selected) {
            unitElement.classList.add('selected');
        } else {
            unitElement.classList.remove('selected');
        }
        if (unit.actions === 0) {
            unitElement.classList.add('acted');
        } else {
            unitElement.classList.remove('acted');
        }
        gameContainer.appendChild(unitElement);
    });
    updateEndTurnButton(units.every(unit => unit.actions === 0));
}

// Функция для вычисления пиксельных координат
function axialToPixel(q, r, offsetX, offsetY) {
    const HEX_RADIUS = 40;
    const HEX_WIDTH = 2 * HEX_RADIUS; // Ширина гекса
    const HEX_HEIGHT = Math.sqrt(3) * HEX_RADIUS * 1.0; // Высота гекса с учетом коэффициента сплющивания
    const HEX_VERTICAL_SPACING = HEX_HEIGHT * 0.5; // Половина высоты гекса для вертикального смещения между рядами
    
    const x = HEX_WIDTH * (q + r / 2) + offsetX;
    const y = HEX_VERTICAL_SPACING * r + offsetY;
    
    return { x, y };
}

// Функция для обновления состояния кнопки конца хода
function updateEndTurnButton(enabled) {
    const button = document.getElementById('end-turn-button');
    button.disabled = !enabled;
}

// Функция для настройки UI
function setupUI() {
    // Добавляем необходимые элементы UI
}

// Функция для настройки обработчиков событий
function setupEventListeners() {
    // Добавляем необходимые обработчики событий
}

// Функция для настройки масштабирования и прокрутки
function setupZoomListeners() {
    const zoomContainer = document.getElementById('zoom-container');
    zoomContainer.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (event.deltaY < 0) {
            zoomLevel *= 1.1;
        } else {
            zoomLevel /= 1.1;
        }
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.transform = `scale(${zoomLevel}) translate(-50%, -50%)`;
    });
}

// Класс Unit
class Unit {
    constructor(q, r, type, owner) {
        this.q = q;
        this.r = r;
        this.type = type;
        this.owner = owner;
        this.actions = 1;
        this.selected = false;
    }

    render() {
        const unitElement = document.createElement('div');
        unitElement.classList.add('unit');
        unitElement.innerText = this.type;
        return unitElement;
    }

    checkState() {
        // Проверка состояния юнита
    }

    upgrade() {
        // Улучшение юнита
    }
}

window.startGame = startGame;
window.endTurn = endTurn;