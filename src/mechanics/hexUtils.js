// mechanics/hexUtils.js
export function getHexLine(a, b) {
    const N = hexDistance(a, b);
    const results = [];
    for (let i = 0; i <= N; i++) {
      results.push(hexRound(hexLerp(a, b, i / N)));
    }
    return results;
  }

// Returns an array of steps; each step is [hex] or [hexA, hexB] when the lerp
// point lies exactly on the boundary between two adjacent hexes.
export function getHexLineDual(a, b) {
    const N = hexDistance(a, b);
    const steps = [];
    for (let i = 0; i <= N; i++) {
      steps.push(hexRoundDual(hexLerp(a, b, i / N)));
    }
    return steps;
  }

  export function hexDistance(a, b) {
    return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
  }

  function hexLerp(a, b, t) {
    return {
      q: a.q + (b.q - a.q) * t,
      r: a.r + (b.r - a.r) * t,
      s: a.s + (b.s - a.s) * t
    };
  }

  export function hexRound(h) {
    let rq = Math.round(h.q);
    let rr = Math.round(h.r);
    let rs = Math.round(h.s);

    const dq = Math.abs(rq - h.q);
    const dr = Math.abs(rr - h.r);
    const ds = Math.abs(rs - h.s);

    if (dq > dr && dq > ds) {
      rq = -rr - rs;
    } else if (dr > ds) {
      rr = -rq - rs;
    } else {
      rs = -rq - rr;
    }

    return { q: rq, r: rr, s: rs };
  }

// When the lerp point lies on the edge between two hexes, returns both candidates.
// A boundary exists when two of the three rounding errors are equal and both
// exceed the third.  In that case either axis could be "fixed" to satisfy
// q+r+s=0, producing two distinct valid hex centres.
function hexRoundDual(h) {
    const rq = Math.round(h.q);
    const rr = Math.round(h.r);
    const rs = Math.round(h.s);

    const dq = Math.abs(rq - h.q);
    const dr = Math.abs(rr - h.r);
    const ds = Math.abs(rs - h.s);

    const EPS = 1e-9;

    if (Math.abs(dq - dr) < EPS && dq > ds + EPS) {
      // boundary between the hex where q wins and the hex where r wins
      return [
        { q: rq,        r: -rq - rs, s: rs },  // fix q, snap r
        { q: -rr - rs,  r: rr,       s: rs }   // fix r, snap q
      ];
    }
    if (Math.abs(dq - ds) < EPS && dq > dr + EPS) {
      // boundary between q-wins and s-wins
      return [
        { q: rq,        r: rr, s: -rq - rr },  // fix q, snap s
        { q: -rr - rs,  r: rr, s: rs        }  // fix s, snap q
      ];
    }
    if (Math.abs(dr - ds) < EPS && dr > dq + EPS) {
      // boundary between r-wins and s-wins
      return [
        { q: rq, r: rr,        s: -rq - rr },  // fix r, snap s
        { q: rq, r: -rq - rs,  s: rs        }  // fix s, snap r
      ];
    }

    return [hexRound(h)];
  }