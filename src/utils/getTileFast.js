import { state } from '../core/state.js';

export function getTileFast(q, r, s) {
  return state.mapIndex?.[`${q},${r},${s}`];
}
