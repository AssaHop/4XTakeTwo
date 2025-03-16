// mechanics/hexUtils.js
export function getHexLine(a, b) {
    const N = hexDistance(a, b);
    const results = [];
    for (let i = 0; i <= N; i++) {
      results.push(hexRound(hexLerp(a, b, i / N)));
    }
    return results;
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
  
  function hexRound(h) {
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