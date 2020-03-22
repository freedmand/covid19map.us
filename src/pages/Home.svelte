<script>
  import { Technical, Region } from "technical";
  import { onMount, onDestroy, tick } from "svelte";
  import booleanPointInPolygon from "@/thirdparty/turf-inside";
  import polylabel from "@/thirdparty/polylabel";
  import Header from "@/components/Header";

  let canvas;

  let displayMatches = [];
  let startTime = Date.now();
  const RATE = 500; // per 100 ms
  let caseIndex = 0;
  let countyProperties = null;
  let stateProperties = null;
  let circleScale = 20;
  const DESIRED_MAX_CIRCLE_SIZE = 3000;
  const LERP = 0.15;

  function interp(z1, z2) {
    return z1 + (z2 - z1) * LERP;
  }

  function eps(n1, n2) {
    return Math.abs(n1 - n2) > 0.005;
  }

  class CovidMap extends Technical {
    constructor(...args) {
      super(...args);

      this.hoverSpots = [];
      this.hovered = {};
    }

    update(...args) {
      this.hoverSpots = [];
      super.update(...args);
    }

    handleMouseMove(x, y) {
      const matches = this.hoverSpots.filter(spot => {
        if (spot.type == "circle") {
          // Easy collision detection using radius
          return (
            Math.sqrt(Math.pow(spot.x - x, 2) + Math.pow(spot.y - y, 2)) <=
            spot.radius
          );
        } else if (spot.type == "poly") {
          return booleanPointInPolygon(
            [x, y],
            spot.coords.multipoly,
            spot.coords.bbox,
            false
          );
        }
      });
      displayMatches = matches.map(match => {
        if (match.data.type == "state") {
          return `${match.data.name}`;
        } else {
          return `${match.data.name} County, ${match.data.state} (${match.data.cases[caseIndex]})`;
        }
      });
    }

    drawCircle(data, coord, radius, fill, stroke, lineWidth = 1) {
      if (coord == null) return null;
      if (Math.abs(radius) < 0.0000001) return null;

      radius /= this.scale;
      lineWidth /= this.scale;

      this.hoverSpots.push({
        type: "circle",
        x: coord.x,
        y: coord.y,
        radius,
        data
      });

      return new Region(
        coord.x - radius,
        coord.y - radius,
        coord.x + radius,
        coord.y + radius,
        () => {
          this.ctx.beginPath();
          this.ctx.arc(coord.x, coord.y, radius, 0, 2 * Math.PI, false);
          this.ctx.fillStyle = fill;
          this.ctx.fill();
          this.ctx.lineWidth = lineWidth;
          this.ctx.strokeStyle = stroke;
          this.ctx.stroke();
        }
      );
    }

    drawPolygon(data, polygon, stroke, lineWidth = 1, fill = null) {
      lineWidth /= this.scale;

      const points = polygon.coords;
      if (points.length == 0) return;
      const coords = [];
      for (let i = 0; i < points.length; i += 2) {
        coords.push({ x: points[i], y: points[i + 1] });
      }
      const xCoords = coords.map(coord => coord.x);
      const yCoords = coords.map(coord => coord.y);

      this.hoverSpots.push({ type: "poly", coords: polygon.centroid, data });

      return new Region(
        Math.min(...xCoords),
        Math.min(...yCoords),
        Math.max(...xCoords),
        Math.max(...yCoords),
        () => {
          this.ctx.beginPath();

          let moveTo = true;
          let firstCoord = null;
          for (let i = 0; i < coords.length; i++) {
            const coord = coords[i];

            if (moveTo) {
              this.ctx.moveTo(coord.x, coord.y);
              moveTo = false;
            } else {
              this.ctx.lineTo(coord.x, coord.y);
            }

            if (firstCoord == null) {
              firstCoord = coord;
            } else {
              if (coord.x == firstCoord.x && coord.y == firstCoord.y) {
                this.ctx.closePath();
                moveTo = true;
                firstCoord = null;
              }
            }
          }
          if (fill != null) {
            this.ctx.fillStyle = fill;
            this.ctx.fill();
          }
          if (stroke != null) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
          }
        }
      );
    }

    process() {
      if (this.data == null) return;
      let changed = false;
      const { states, counties, maxCountyCases, numDays } = this.data;

      const stateRegions = states.map((state, i) => {
        return this.drawPolygon(
          state,
          state.polygon,
          "rgb(128, 128, 128)",
          0.5
        );
      });

      const countyRegions = [];
      const circleRegions = [];
      // Track bounds on county circles
      let minX = null;
      let maxX = null;
      let minY = null;
      let maxY = null;
      for (let i = 0; i < counties.length; i++) {
        const county = counties[i];
        const countyProperty =
          countyProperties == null
            ? {}
            : countyProperties[i] == null
            ? {}
            : countyProperties[i];

        // Get previous county properties

        const prevCircleSize = countyProperty.circleSize || 0;
        const desiredCircleSize =
          (Math.sqrt(county.cases[caseIndex]) * circleScale) / 5;

        // Update max bounds
        if (county.polygon.centroid != null) {
          const maxCircleSize =
            (Math.sqrt(county.cases[county.cases.length - 1]) * circleScale) /
            5;
          const x1 = county.polygon.centroid.x - maxCircleSize;
          const y1 = county.polygon.centroid.y - maxCircleSize;
          const x2 = county.polygon.centroid.x + maxCircleSize;
          const y2 = county.polygon.centroid.y + maxCircleSize;
          if (minX == null || x1 < minX) {
            minX = x1;
          }
          if (maxX == null || x2 > maxX) {
            maxX = x2;
          }
          if (minY == null || y1 < minY) {
            minY = y1;
          }
          if (maxY == null || y2 > maxY) {
            maxY = y2;
          }
        }

        const prevShading = countyProperty.countyShading || 0;
        const desiredShading =
          county.cases[caseIndex] == 0
            ? 0
            : Math.max(
                Math.pow(county.cases[caseIndex] / maxCountyCases, 0.3) * 0.5,
                0.08
              );

        const circleSize = interp(prevCircleSize, desiredCircleSize);
        let countyShading = interp(prevShading, desiredShading);
        if (countyShading < 0.01 && desiredShading < 0.01)
          countyShading = desiredShading;
        if (eps(circleSize, desiredCircleSize)) changed = true;
        if (eps(countyShading, desiredShading)) changed = true;

        if (countyProperties == null) countyProperties = [];
        if (countyProperties[i] == null) countyProperties[i] = {};
        countyProperties[i] = {
          ...countyProperties[i],
          circleSize,
          countyShading
        };

        const shade = 255 - countyShading * 255;
        const lineShade = shade == 255 ? 255 : Math.min(shade * 0.8, 255);
        countyRegions.push(
          this.drawPolygon(
            county,
            county.polygon,
            `rgb(${lineShade}, ${lineShade}, ${lineShade})`,
            0.2,
            countyShading == 0 ? null : `rgb(255, ${shade}, ${shade})`
          )
        );

        circleRegions.push(
          this.drawCircle(
            county,
            county.polygon.centroid,
            circleSize,
            "rgba(255, 0, 0, 0.2)",
            "rgba(255, 0, 0, 0.8)",
            1
          )
        );
      }

      let group = null;
      const add = region => {
        if (region == null) return;
        this.add(region);
        if (group == null) {
          group = region;
        } else {
          group = group.combine(region);
        }
      };

      // Draw counties, then state borders, then circles
      countyRegions.forEach(region => add(region));
      stateRegions.forEach(region => add(region));
      circleRegions.forEach(region => add(region));

      // Add blank region for bounds
      add(new Region(minX, minY, maxX, maxY));

      if (changed) {
        requestAnimationFrame(() => this.update(this.data));
      } else {
        console.log("NO CHANGE");
      }
    }
  }

  function process(arrayBuffer) {
    let position = 0;
    let currentState = null;
    let stateCases = {};
    let stateDeaths = {};
    let totalCases = [];
    let totalDeaths = [];
    let maxCountyCases = 0;
    let maxCountyDeaths = 0;

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
      const coordBuffer = new Float32Array(arrayBuffer, position, length).map(
        x => x * 2
      );
      position += length * 4 + 1;

      return {
        coords: coordBuffer,
        centroid: getCentroid(coordBuffer)
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
        const results = {
          type: "state",
          shortcode: parts[0],
          name: parts[1],
          polygon: readPolygon()
        };
        currentState = results.name;

        // Initialize state cases/deaths
        stateCases[currentState] = [];
        stateDeaths[currentState] = [];
        return results;
      } else {
        let results = {
          type: "county",
          state: currentState,
          name,
          polygon: readPolygon()
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
          totalDeaths[i] += deathCount;
        }
        return results;
      }
    };

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
    const maxCircleSize = (Math.sqrt(maxCountyCases) * circleScale) / 5;
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

    return {
      firstDate,
      states,
      counties,
      stateCases,
      stateDeaths,
      totalCases,
      totalDeaths,
      maxTotalCases: Math.max(...totalCases),
      maxCountyCases,
      maxCountyDeaths,
      numDays,
      dates
    };
  }

  function downloadData() {
    const req = new XMLHttpRequest();

    req.onload = async e => {
      data = process(req.response);
      await tick();
      setCaseIndex(data.numDays - 1);
    };

    req.open("GET", "/output.bin");
    req.responseType = "arraybuffer";
    req.send();
  }

  function setCaseIndex(i) {
    caseIndex = i;
    try {
      casesElem.children[caseIndex].scrollIntoView();
    } catch (e) {}
    covidMap.update(data);
  }

  let data = null;
  let covidMap = null;

  $: {
    if (data != null && covidMap != null) {
      covidMap.update(data);
    }
  }

  let casesElem;

  onMount(() => {
    downloadData();
    covidMap = new CovidMap(canvas, null, true, 50);
  });

  onDestroy(() => {
    if (covidMap != null) covidMap.destroy();
  });

  let resizeTimeout = null;

  function handleResize() {
    if (resizeTimeout != null) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
    resizeTimeout = setTimeout(() => {
      if (covidMap != null && data != null) covidMap.update(data);
      resizeTimeout = null;
    }, 100);
  }
</script>

<style lang="scss">
  :global(body, html) {
    overflow: hidden;
    margin: 0;
    padding: 0;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  :global(a) {
    color: inherit;
    text-decoration: inherit;

    &:hover {
      opacity: 0.8;
    }
  }

  .canvas {
    width: 100%;
    height: calc(100% - #{$headerHeight + $datesHeight});
  }

  .dates {
    height: $datesHeight;
    overflow-x: scroll;
    overflow-y: hidden;
    white-space: nowrap;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }

    .date {
      display: inline-block;
      height: $datesHeight;
      text-align: center;
      padding: 10px 15px 0 15px;
      box-sizing: border-box;
      color: rgba(0, 0, 0, 0.6);
      position: relative;
      user-select: none;

      &:hover {
        background: rgba(0, 0, 0, 0.05);
        cursor: pointer;

        &.selected {
          background: #e3eaff;
        }
      }

      .text {
        color: black;
        mix-blend-mode: hard-light;
        text-shadow: 0 0 2px white;
        z-index: 1;
      }

      .bar {
        position: absolute;
        left: 5px;
        right: 5px;
        background: red;
        bottom: 0;
        opacity: 0.5;
      }

      &.selected {
        background: #e3eaff;

        .bar {
          opacity: 0.8;
        }
      }

      .weekday {
        font-weight: bold;
        font-size: 12px;
        text-align: left;
      }

      .cases {
        padding: 7px 0 0 0;
        font-weight: bold;
      }

      .casestext {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
    }
  }
</style>

<Header />
<div class="canvas">
  <canvas bind:this={canvas} />
</div>
{#if data != null}
  <div class="dates" bind:this={casesElem}>
    {#each data.dates as { text, weekday }, i}
      <div
        class="date"
        class:selected={caseIndex == i}
        on:click={() => setCaseIndex(i)}>
        <div
          class="bar"
          style="height: {(data.totalCases[i] / data.maxTotalCases) * 95}%" />
        <div class="text">
          <div class="weekday">{weekday}</div>
          <div class="day">{text}</div>
          <div class="cases">{data.totalCases[i].toLocaleString()}</div>
          <div class="casestext">cases</div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<svelte:window
  on:keydown={e => {
    if (data == null) return;
    if (e.code == 'ArrowLeft') {
      setCaseIndex(Math.max(caseIndex - 1, 0));
    } else if (e.code == 'ArrowRight') {
      setCaseIndex(Math.min(caseIndex + 1, data.numDays - 1));
    }
  }}
  on:resize={handleResize} />
