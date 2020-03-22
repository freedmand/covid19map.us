// Adapted from https://github.com/Turfjs/turf/blob/master/packages/turf-boolean-point-in-polygon/index.ts

export default function booleanPointInPolygon(
  pt,
  polys,
  bbox,
  ignoreBoundary = true
) {
  // Quick elimination if point is not inside bbox
  if (bbox && inBBox(pt, bbox) === false) {
    return false;
  }

  let insidePoly = false;
  for (let i = 0; i < polys.length && !insidePoly; i++) {
    // check if it is in the outer ring first
    if (inRing(pt, polys[i][0], ignoreBoundary)) {
      let inHole = false;
      let k = 1;
      // check for the point in any of the holes
      while (k < polys[i].length && !inHole) {
        if (inRing(pt, polys[i][k], !ignoreBoundary)) {
          inHole = true;
        }
        k++;
      }
      if (!inHole) {
        insidePoly = true;
      }
    }
  }
  return insidePoly;
}

/**
* inRing
*
* @private
* @param {Array<number>} pt [x,y]
* @param {Array<Array<number>>} ring [[x,y], [x,y],..]
* @param {boolean} ignoreBoundary ignoreBoundary
* @returns {boolean} inRing
*/
function inRing(pt, ring, ignoreBoundary) {
  let isInside = false;
  if (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
    ring = ring.slice(0, ring.length - 1);
  }
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const onBoundary = (pt[1] * (xi - xj) + yi * (xj - pt[0]) + yj * (pt[0] - xi) === 0) &&
      ((xi - pt[0]) * (xj - pt[0]) <= 0) && ((yi - pt[1]) * (yj - pt[1]) <= 0);
    if (onBoundary) {
      return !ignoreBoundary;
    }
    const intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
      (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
    if (intersect) {
      isInside = !isInside;
    }
  }
  return isInside;
}
/**
* inBBox
*
* @private
* @param {Position} pt point [x,y]
* @param {BBox} bbox BBox [west, south, east, north]
* @returns {boolean} true/false if point is inside BBox
*/
function inBBox(pt, bbox) {
  return bbox[0] <= pt[0] &&
    bbox[1] <= pt[1] &&
    bbox[2] >= pt[0] &&
    bbox[3] >= pt[1];
}
