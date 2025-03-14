import { cubeToPixel, HEX_RADIUS, squashFactor } from '../world/map.js';
import { state, mapOffsetX, mapOffsetY } from '../core/game.js';

let scale = 1;
let hexOffsetX = 0;
let hexOffsetY = 0;

function renderMap(newScale = state.scale ?? scale, offset = state.offset ?? { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    scale = newScale;
    state.scale = scale;
    state.offset = offset;

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const offsetX = offset.x;
    const offsetY = offset.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    if (!state.map || state.map.length === 0) {
        console.error('Map data is empty');
        return;
    }

    console.log('Rendering map with data:', state.map);

    state.map.forEach(row => {
        row.forEach(cell => {
            const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, 0, 0, hexOffset.x, hexOffset.y);
            const isHighlighted = state.highlightedHexes.some(hex => hex.q === cell.q && hex.r === cell.r && hex.s === cell.s);
            drawHex(ctx, x, y, HEX_RADIUS, cell.type, isHighlighted);
        });
    });

    console.log(`🎨 FINAL RENDER - Scale: ${scale}, Offset: (${offset.x}, ${offset.y})`);
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

function renderUnits(newScale = state.scale ?? scale, offset = state.offset ?? { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const offsetX = offset.x;
    const offsetY = offset.y;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(newScale, newScale);

    state.units.forEach(unit => {
        const { x, y } = cubeToPixel(unit.q, unit.r, unit.s, 0, 0, hexOffset.x, hexOffset.y);
        drawUnit(ctx, x, y, unit);
        console.log(`🧍 Draw unit at cube(${unit.q},${unit.r},${unit.s}) → pixel(${x.toFixed(2)},${y.toFixed(2)})`);
    });

    ctx.restore();
    console.log('Units rendered');
}

function drawUnit(ctx, x, y, unit) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, HEX_RADIUS / 2, 0, 2 * Math.PI);
    ctx.fillStyle = unit.color || '#000';
    ctx.fill();
    ctx.stroke();

    // Отметка выбранного
    if (unit.selected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ff0';
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
    }

    // ❤️ Отрисовка HP
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${unit.hp}/${unit.maxHp}`, x, y + HEX_RADIUS / 2 + 12);
    ctx.restore();
}

function highlightHexes(hexes) {
    state.highlightedHexes = hexes;
    renderMap(state.scale, state.offset);
}

export { renderMap, renderUnits, highlightHexes };
