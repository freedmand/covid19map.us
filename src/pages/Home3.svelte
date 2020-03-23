<script>
  import Header from "@/components/Header";
  import { smoothly } from "@/util/smoothly";
  import { processCovidData } from "@/processing/processCovidData";

  import { onMount } from "svelte";

  // Element bindings
  let canvasElem;

  // Pixi application
  let app = null;

  // Covid Map
  let data = null;
  let caseIndex = 0;

  function downloadData() {
    return new Promise(resolve => {
      const req = new XMLHttpRequest();

      req.onload = e => {
        resolve(processCovidData(req.response));
      };

      req.open("GET", "/output.bin");
      req.responseType = "arraybuffer";
      req.send();
    });
  }

  onMount(async () => {
    app = new PIXI.Application({
      antialias: true,
      resolution: window.devicePixelRatio,
      autoResize: true,
      autoStart: false
    });
    app.renderer.resize(canvasElem.offsetWidth, canvasElem.offsetHeight);
    canvasElem.appendChild(app.view);
    data = await downloadData();
    resizeData();
    caseIndex = data.numDays - 1;
    draw(data);
  });

  const PADDING_Y = 20;
  const PADDING_X = 20;
  function resizeData() {
    if (data == null || canvasElem == null) return;
    const width = canvasElem.offsetWidth - PADDING_X * 2;
    const height = canvasElem.offsetHeight - PADDING_Y * 2;
    const bounds = data.bounds;
    const boundsWidth = bounds[2] - bounds[0];
    const boundsHeight = bounds[3] - bounds[1];
    const scale = Math.min(width / boundsWidth, height / boundsHeight);
    const actualWidth = boundsWidth * scale;
    const actualHeight = boundsHeight * scale;
    const paddingLeft = (width - boundsWidth * scale) / 2;
    const paddingTop = (height - boundsHeight * scale) / 2;

    const normalizeX = x =>
      ((x - bounds[0]) / boundsWidth) * actualWidth + paddingLeft + PADDING_X;
    const normalizeY = y =>
      ((y - bounds[1]) / boundsHeight) * actualHeight + paddingTop + PADDING_Y;

    const normalizePlace = place => {
      if (place.polygon.centroid == null) return;
      const multipoly = place.polygon.centroid.multipoly;
      place.polygon.normalized = multipoly.map(poly =>
        poly.map(coords =>
          coords.map(([x, y]) => [normalizeX(x), normalizeY(y)]).flat()
        )
      );
    };

    for (let i = 0; i < data.states.length; i++) {
      normalizePlace(data.states[i]);
    }

    for (let i = 0; i < data.counties.length; i++) {
      normalizePlace(data.counties[i]);
    }
  }

  function draw(data) {
    console.log("drawing");
    const graphics = new PIXI.Graphics();

    const drawPoly = (multipoly, style) => {
      if (multipoly == null) return;
      multipoly.forEach(poly => {
        if (style.fill) {
          graphics.beginFill(...style.fill);
        } else {
        }
        if (style.stroke) {
          graphics.lineStyle(...style.stroke);
        } else {
          graphics.lineStyle(0);
        }
        poly.forEach((subpoly, i) => {
          if (i == 1) graphics.beginHole();
          graphics.drawPolygon(subpoly);
        });
        if (poly.length > 1) graphics.endHole();
        if (style.fill) {
          graphics.endFill();
        }
        if (style.stroke) {
          graphics.closePath();
        }
      });
    };

    for (let i = 0; i < data.counties.length; i++) {
      const county = data.counties[i];

      drawPoly(county.polygon.normalized, {
        fill: [0x221100, 1],
        stroke: [1, 0xff0000, 0.2]
      });
    }

    for (let i = 0; i < data.states.length; i++) {
      const state = data.states[i];

      drawPoly(state.polygon.normalized, { stroke: [1, 0xff0000, 1] });
    }

    app.stage.addChild(graphics);
  }

  function handleResize() {
    if (app != null) {
      smoothly("pixi resize", () => {
        resizeData();
        app.renderer.resize(canvasElem.offsetWidth, canvasElem.offsetHeight);
      });
    }
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
    height: calc(100% - #{$headerHeight});
  }
</style>

<Header />

<div class="canvas" bind:this={canvasElem} />

<svelte:window on:resize={handleResize} />
