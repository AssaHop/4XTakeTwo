import { map, cubeToPixel, HEX_RADIUS } from '../world/map.js';
import { units } from '../core/game.js';
import { updateEndTurnButton } from './events.js';

let scale = 1; // Переменная для хранения текущего масштаба

function renderMap(newScale = scale) {
    scale = newScale; // Обновляем текущий масштаб
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale); // Масштабируем канвас

    map.forEach(row => {
        row.forEach(cell => {
            const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, offsetX / scale, offsetY / scale);
            drawHex(ctx, x, y, HEX_RADIUS, cell.type);
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
        const y_i = y + radius * Math.sin(angle);
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

function renderUnits(newScale = scale) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    ctx.save();
    ctx.scale(newScale, newScale); // Масштабируем канвас

    units.forEach(unit => {
        const { x, y } = cubeToPixel(unit.q, unit.r, unit.s, offsetX / newScale, offsetY / newScale);
        drawUnit(ctx, x, y, unit);
    });

    ctx.restore();
    console.log('Units rendered');
    updateEndTurnButton(units.every(unit => unit.actions === 0));
}

function drawUnit(ctx, x, y, unit) {
    ctx.beginPath();
    ctx.arc(x, y, HEX_RADIUS / 2, 0, 2 * Math.PI);
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
}

export { renderMap, renderUnits };