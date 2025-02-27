import { cubeToPixel, HEX_RADIUS, squashFactor } from '../world/map.js';
import { state } from '../core/state.js';
import { updateEndTurnButton } from './events.js';

let scale = 1; // Переменная для хранения текущего масштаба
let hexOffsetX = 0; // Горизонтальное смещение гексов
let hexOffsetY = 0; // Вертикальное смещение гексов

function renderMap(newScale = scale, offset = { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    scale = newScale; // Обновляем текущий масштаб
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const offsetX = canvas.width / 2 + offset.x;
    const offsetY = canvas.height / 2 + offset.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale); // Масштабируем канвас

    // Проверка и логирование данных карты
    if (!state.map || state.map.length === 0) {
        console.error('Map data is empty');
        return;
    } else {
        console.log('Rendering map with data:', state.map);
    }

    state.map.forEach(row => {
        row.forEach(cell => {
            const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, offsetX / scale, offsetY / scale, hexOffset.x, hexOffset.y);
            drawHex(ctx, x, y, HEX_RADIUS, cell.type); // Применяем squashFactor только к вертикальному расстоянию
        });
    });

    ctx.restore();
    console.log('Map rendered');
}

function drawHex(ctx, x, y, radius, type) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = 2 * Math.PI / 6 * (i + 0.5);
        const x_i = x + radius * Math.cos(angle);
        const y_i = y + radius * Math.sin(angle) * squashFactor; // Применяем squashFactor только к вертикальному расстоянию
        if (i === 0) {
            ctx.moveTo(x_i, y_i);
        } else {
            ctx.lineTo(x_i, y_i);
        }
    }
    ctx.closePath();
    ctx.fillStyle = type === 'walkable' ? '#3090ff' : '#a42';
    ctx.fill();
    ctx.stroke();
}

function renderUnits(newScale = scale, offset = { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const offsetX = canvas.width / 2 + offset.x;
    const offsetY = canvas.height / 2 + offset.y;

    ctx.save();
    ctx.scale(newScale, newScale); // Масштабируем канвас

    state.units.forEach(unit => {
        const { x, y } = cubeToPixel(unit.q, unit.r, unit.s, offsetX / newScale, offsetY / newScale, hexOffset.x, hexOffset.y);
        drawUnit(ctx, x, y, unit);
    });

    ctx.restore();
    console.log('Units rendered');
    updateEndTurnButton(state.units.every(unit => unit.actions === 0));
}

function drawUnit(ctx, x, y, unit) {
    ctx.save();
    ctx.scale(1, 1 / squashFactor); // Применяем обратный squashFactor только к вертикальному расстоянию для текстур юнитов
    ctx.beginPath();
    ctx.arc(x, y * squashFactor, HEX_RADIUS / 2, 0, 2 * Math.PI); // Не применяем squashFactor к радиусу
    ctx.fillStyle = unit.color;
    ctx.fill();
    ctx.stroke();
    if (unit.selected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ff0';
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
    }
    ctx.restore();
}

export { renderMap, renderUnits };