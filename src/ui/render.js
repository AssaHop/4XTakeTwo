import { cubeToPixel, HEX_RADIUS, squashFactor } from '../world/map.js';
import { state, mapOffsetX, mapOffsetY } from '../core/game.js';
import { updateEndTurnButton } from './events.js';

let scale = 1; 
let hexOffsetX = 0; 
let hexOffsetY = 0; 

function renderMap(newScale = scale, offset = { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    scale = newScale; 
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const offsetX = canvas.width / 2 + offset.x;
    const offsetY = canvas.height / 2 + offset.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale); 

    if (!state.map || state.map.length === 0) {
        console.error('Map data is empty');
        return;
    } else {
        console.log('Rendering map with data:', state.map);
    }

    state.map.forEach(row => {
        row.forEach(cell => {
            const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, mapOffsetX, mapOffsetY, hexOffset.x, hexOffset.y);
            const isHighlighted = state.highlightedHexes.some(hex => hex.q === cell.q && hex.r === cell.r && hex.s === cell.s);
            drawHex(ctx, x, y, HEX_RADIUS, cell.type, isHighlighted); 
        });
    });

    ctx.restore();
    console.log('Map rendered');
}

function drawHex(ctx, x, y, radius, type, isHighlighted = false) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = 2 * Math.PI / 6 * (i + 0.5);
        const x_i = x + radius * Math.cos(angle);
        const y_i = y + radius * Math.sin(angle) * squashFactor; 
        if (i === 0) {
            ctx.moveTo(x_i, y_i);
        } else {
            ctx.lineTo(x_i, y_i);
        }
    }
    ctx.closePath();
    ctx.fillStyle = isHighlighted ? '#ffff00' : (type === 'walkable' ? '#3090ff' : '#a42');
    ctx.fill();
    ctx.stroke();
}

function renderUnits(newScale = scale, offset = { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const offsetX = canvas.width / 2 + offset.x;
    const offsetY = canvas.height / 2 + offset.y;

    ctx.save();
    ctx.scale(newScale, newScale); 

    state.units.forEach(unit => {
        const { x, y } = cubeToPixel(unit.q, unit.r, unit.s, mapOffsetX, mapOffsetY, hexOffset.x, hexOffset.y);
        drawUnit(ctx, x, y, unit);
    });

    ctx.restore();
    console.log('Units rendered');
    updateEndTurnButton(state.units.every(unit => unit.actions === 0));
}

function drawUnit(ctx, x, y, unit) {
    ctx.save();
    ctx.scale(1, 1 / squashFactor); 
    ctx.beginPath();
    ctx.arc(x, y * squashFactor, HEX_RADIUS / 2, 0, 2 * Math.PI); 
    ctx.fillStyle = unit.color || '#000'; // Добавляем цвет по умолчанию
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

function highlightHexes(hexes) {
    state.highlightedHexes = hexes;
    renderMap(scale, { x: hexOffsetX, y: hexOffsetY });
}

export { renderMap, renderUnits, highlightHexes };