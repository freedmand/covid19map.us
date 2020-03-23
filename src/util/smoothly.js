const smoothlies = {};



export function smoothly(id, fn, timeout = 100) {
  if (smoothlies[id] != null) {
    clearTimeout(smoothlies[id]);
    smoothlies[id] = null;
  }
  smoothlies[id] = setTimeout(fn, timeout);
}
