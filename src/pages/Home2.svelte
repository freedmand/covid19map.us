<script>
  import { Technical, Region } from "technical";
  import { onMount, onDestroy, tick } from "svelte";
  import { processCovidData } from "@/processing/processCovidData";
  import booleanPointInPolygon from "@/thirdparty/turf-inside";
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

  function downloadData() {
    const req = new XMLHttpRequest();

    req.onload = async e => {
      data = processCovidData(req.response);

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

    @include on-hover {
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

      @include on-hover {
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
