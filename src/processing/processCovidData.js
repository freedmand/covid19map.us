import polylabel from "@/thirdparty/polylabel";

export const DESIRED_MAX_CIRCLE_SIZE = 3000;
let circleScale = 20;

export function downloadData() {
  return new Promise(resolve => {
    const req = new XMLHttpRequest();

    req.onload = () => {
      resolve(processCovidData(req.response));
    };

    req.open("GET", "/output.bin");
    req.responseType = "arraybuffer";
    req.send();
  });
}

export function processCovidData(arrayBuffer) {
  let position = 0;
  let currentState = null;
  let stateCases = {};
  let stateDeaths = {};
  let totalCases = [];
  let totalDeaths = [];
  let totalPopulation = 0;
  let maxCountyCases = 0;
  let maxCountyDeaths = 0;

  let globalMinX = null;
  let globalMinY = null;
  let globalMaxX = null;
  let globalMaxY = null;

  const readLine = () => {
    const buffer = new Uint8Array(arrayBuffer, position);

    let text = "";
    let i;
    for (i = 0; i < buffer.length; i++) {
      const char = String.fromCharCode(buffer[i]);
      if (char == "\n") {
        position++;
        return text;
      }
      text += char;
      position++;
    }
    return text;
  };

  const is_clockwise = poly => {
    // From https://stackoverflow.com/a/1165943
    let total = 0;
    for (let i = 0; i < poly.length; i++) {
      const x1 = poly[i]["x"];
      const x2 = poly[(i + 1) % poly.length]["x"];
      const y1 = poly[i]["y"];
      const y2 = poly[(i + 1) % poly.length]["y"];
      total += (x2 - x1) * (y2 + y1);
    }
    return total >= 0;
  };

  const getCentroid = coords => {
    let firstCoord = null;
    const polys = [];
    let path = [];
    let xMin = null;
    let xMax = null;
    let yMin = null;
    let yMax = null;

    const pushPath = () => {
      if (path.length > 0) {
        polys.push(path);
        path = [];
        firstCoord = null;
      }
    };

    for (let i = 0; i < coords.length; i += 2) {
      const coord = [coords[i], coords[i + 1]];
      path.push(coord);

      // Set bounds
      if (xMin == null || coord[0] < xMin) {
        xMin = coord[0];
      }
      if (xMax == null || coord[0] > xMax) {
        xMax = coord[0];
      }
      if (yMin == null || coord[1] < yMin) {
        yMin = coord[1];
      }
      if (yMax == null || coord[1] > yMax) {
        yMax = coord[1];
      }

      if (globalMinX == null || coord[0] < globalMinX) {
        globalMinX = coord[0];
      }
      if (globalMaxX == null || coord[0] > globalMaxX) {
        globalMaxX = coord[0];
      }
      if (globalMinY == null || coord[1] < globalMinY) {
        globalMinY = coord[1];
      }
      if (globalMaxY == null || coord[1] > globalMaxY) {
        globalMaxY = coord[1];
      }

      if (firstCoord == null) {
        firstCoord = coord;
      } else {
        if (coord[0] == firstCoord[0] && coord[1] == firstCoord[1]) {
          pushPath();
        }
      }
    }

    pushPath();

    const orientations = polys.map(poly => is_clockwise(poly));

    const multipoly = [];
    let currentPoly = [];
    let maxPolyLabel = null;
    let lastOrientation = null;

    const pushPoly = () => {
      if (currentPoly.length == 0) return;
      const [x, y, d] = polylabel(currentPoly);
      if (maxPolyLabel == null || d > maxPolyLabel.d) {
        maxPolyLabel = { x, y, d };
      }
      multipoly.push(currentPoly);
    };

    for (let i = 0; i < polys.length; i++) {
      if (orientations[i] == false) {
        pushPoly(currentPoly);
        currentPoly = [];
      }
      currentPoly.push(polys[i]);
      lastOrientation = orientations[i];
    }

    pushPoly(currentPoly);

    if (maxPolyLabel != null) {
      maxPolyLabel.multipoly = multipoly;
      maxPolyLabel.bbox = [xMin, yMin, xMax, yMax];
    }

    return maxPolyLabel;
  };

  const readPolygon = () => {
    position = Math.ceil(position / 4) * 4;
    const lenBuffer = new Int32Array(arrayBuffer, position, 1);
    const length = lenBuffer[0];
    position += 4;

    let population = null;
    if (length > 0) {
      // Read additional stats
      const popBuffer = new Int32Array(arrayBuffer, position, 1);
      population = popBuffer[0];
      position += 4;
    }

    const coordBuffer = new Uint16Array(arrayBuffer, position, length);
    position += length * 2 + 1;
    const convertedCoordBuffer = Float32Array.from(coordBuffer);

    return {
      polygon: {
        coords: convertedCoordBuffer,
        centroid: getCentroid(convertedCoordBuffer),
      }, stats: { population }
    };
  };

  const readCases = () => {
    const cases = readLine()
      .split(",")
      .map(x => parseInt(x));
    const results = [];

    let maxAmount = 0;

    let push = x => {
      results.push(x);
      if (x > maxAmount) maxAmount = x;
    };

    let parseRun = true;
    for (let i = 0; i < cases.length; i++) {
      const count = cases[i];
      if (parseRun && count == 0) {
        parseRun = false;
      } else if (parseRun) {
        const value = cases[i + 1];
        for (let j = 0; j < count; j++) {
          push(value);
        }
        i++;
      } else {
        push(cases[i]);
      }
    }

    return { results, maxAmount };
  };

  const readCountyOrState = () => {
    const name = readLine();
    if (name.startsWith(">")) {
      const parts = name.substr(1).split("-");
      const { polygon, stats } = readPolygon();
      const results = {
        type: "state",
        shortcode: parts[0],
        name: parts[1],
        polygon,
        stats
      };
      totalPopulation += stats.population;
      currentState = results.name;

      // Initialize state cases/deaths
      stateCases[currentState] = [];
      stateDeaths[currentState] = [];
      return results;
    } else {
      const { polygon, stats } = readPolygon();
      let results = {
        type: "county",
        state: currentState,
        name,
        polygon,
        stats,
      };
      const { results: cases, maxAmount: numCountyCases } = readCases();
      const { results: deaths, maxAmount: numCountyDeaths } = readCases();

      if (numCountyCases > maxCountyCases) {
        maxCountyCases = numCountyCases;
      }
      if (numCountyDeaths > maxCountyDeaths) {
        maxCountyDeaths = numCountyDeaths;
      }
      results = { ...results, cases, deaths };

      // Increment state cases/deaths
      for (let i = 0; i < cases.length; i++) {
        const caseCount = cases[i];
        const deathCount = deaths[i];
        if (stateCases[currentState][i] == null) {
          stateCases[currentState][i] = 0;
        }
        if (totalCases[i] == null) {
          totalCases[i] = 0;
        }
        stateCases[currentState][i] += caseCount;
        totalCases[i] += caseCount;
        if (stateDeaths[currentState][i] == null) {
          stateDeaths[currentState][i] = 0;
        }
        if (totalDeaths[i] == null) {
          totalDeaths[i] = 0;
        }
        stateDeaths[currentState][i] += deathCount;
        totalDeaths[i] += deathCount;
      }
      return results;
    }
  };

  const lastUpdated = readLine().trim().replace('Pacific', 'PST').replace(/\/.*$/, '').replace(', at', ' at');
  const firstDateRaw = readLine();
  const dateParts = firstDateRaw.split("/").map(x => parseInt(x));
  const firstDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);

  const states = [];
  const counties = [];
  let id = 1;
  while (position < arrayBuffer.byteLength) {
    const place = readCountyOrState();
    if (place.type == "state") {
      states.push({ ...place, id });
    } else {
      counties.push({ ...place, id });
    }
    id++;
  }

  // Calculate max circle size
  const maxCircleSize = Math.sqrt(maxCountyCases) * circleScale;
  circleScale = DESIRED_MAX_CIRCLE_SIZE / maxCircleSize;

  const rawDates = [];
  const numDays = counties[0].cases.length;
  for (let i = 0; i < numDays; i++) {
    // Adapted from https://codewithhugo.com/add-date-days-js/
    const newDate = new Date(Number(firstDate));
    newDate.setDate(newDate.getDate() + i);
    rawDates.push(newDate);
  }
  const dates = rawDates.map(d => ({
    text: d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    }),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" })
  }));

  // Calculate bounds with circles
  for (let i = 0; i < counties.length; i++) {
    const county = counties[i];
    if (county.polygon.centroid == null) continue;
    const xMin = county.polygon.centroid.x - Math.sqrt(county.cases[numDays - 1]) * circleScale;
    const xMax = county.polygon.centroid.x + Math.sqrt(county.cases[numDays - 1]) * circleScale;
    const yMin = county.polygon.centroid.y - Math.sqrt(county.cases[numDays - 1]) * circleScale;
    const yMax = county.polygon.centroid.y + Math.sqrt(county.cases[numDays - 1]) * circleScale;

    if (xMin < globalMinX) globalMinX = xMin;
    if (xMax > globalMaxX) globalMaxX = xMax;
    if (yMin < globalMinY) globalMinY = yMin;
    if (yMax > globalMaxY) globalMaxY = yMax;
  }

  // Convert states to dictionary
  const statesByName = {};
  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    statesByName[state.name] = state;
  }

  return {
    firstDate,
    states,
    statesByName,
    counties,
    stateCases,
    stateDeaths,
    totalCases,
    totalDeaths,
    totalPopulation,
    maxTotalCases: Math.max(...totalCases),
    maxTotalDeaths: Math.max(...totalDeaths),
    maxCountyCases,
    maxCountyDeaths,
    numDays,
    dates,
    lastUpdated,
    bounds: [globalMinX, globalMinY, globalMaxX, globalMaxY]
  };
}
