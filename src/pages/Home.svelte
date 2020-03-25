<script>
  import Header from "@/components/Header";
  import Footer from "@/components/Footer";
  import Dates from "@/components/Dates";
  import { Svue } from "svue";
  import { ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
  import { HeatmapLayer } from "@deck.gl/aggregation-layers";
  import {
    Deck,
    COORDINATE_SYSTEM,
    OrthographicView,
    FlyToInterpolator
  } from "@deck.gl/core";
  import {
    downloadData,
    DESIRED_MAX_CIRCLE_SIZE
  } from "@/processing/processCovidData";
  import { onMount, tick } from "svelte";
  import { cubicOut } from "svelte/easing";
  import TagmapLayer from "@/thirdparty/tagmap-layer";

  import resetZoomSvg from "@/assets/resetZoom.svg";

  let data = null;
  let loading = true;
  let canvasElem = null;
  let panned = false;

  // See https://github.com/uber/deck.gl/issues/4420
  let hackyCounter = 0;

  let windowWidth = 0;
  let windowHeight = 0;

  const TRANSITION = {
    type: "spring"
  };

  function resetZoom() {
    if (data == null) return;

    const screenWidth = windowWidth;
    const screenHeight = windowHeight;
    const scale = Math.min(
      screenWidth / data.width,
      screenHeight / data.height
    );
    const zoom = Math.log2(scale) - 0.1;
    data.initialZoom = zoom;
    data.zoom = zoom;

    data.deck._onViewStateChange({
      hackyForceViewStateChange: true,
      target: [data.midX, data.midY],
      zoom
    });
    panned = false;
  }

  class Data extends Svue {
    constructor(data) {
      super({
        data() {
          return {
            ...data,
            deck: null,
            mode: "cases",
            caseIndex: data.numDays - 1,
            circleScale: 50,
            retainCircleSize: true,
            showTextLabels: true,
            initialZoom: 0,
            showCounties: true,
            zoom: 0
          };
        },
        watch: {
          layers() {
            console.log("REDRAWING LAYERS", this.layers);
            if (this.deck != null) {
              console.log("animating");
              this.deck.setProps({ layers: this.layers });
            }
          },
          caseIndex() {
            console.log("CASE INDEX", this.caseIndex);
          },
          deck() {
            console.log("DECK", this.deck);
          }
        },
        computed: {
          zoomScale(initialZoom, zoom) {
            const initial = Math.pow(2, initialZoom);
            const current = Math.pow(2, zoom);
            return Math.min(initial / current, 1);
          },
          effectiveCircleScale(zoomScale, circleScale, retainCircleSize) {
            if (retainCircleSize) {
              return circleScale * zoomScale;
            } else {
              return circleScale;
            }
          },
          minX(bounds) {
            return bounds[0];
          },
          maxX(bounds) {
            return bounds[2];
          },
          minY(bounds) {
            return bounds[1];
          },
          maxY(bounds) {
            return bounds[3];
          },
          width(minX, maxX) {
            return maxX - minX;
          },
          height(minY, maxY) {
            return maxY - minY;
          },
          midX(minX, width) {
            return minX + width / 2;
          },
          midY(minY, height) {
            return minY + height / 2;
          },
          polygonCounties(counties) {
            return counties.filter(county => county.polygon.centroid != null);
          },
          countyRegions(polygonCounties, caseIndex, mode) {
            return polygonCounties
              .map(county =>
                county.polygon.centroid.multipoly.map(poly => ({
                  poly,
                  county,
                  value:
                    mode == "cases"
                      ? county.cases[caseIndex]
                      : county.deaths[caseIndex]
                }))
              )
              .flat(1);
          },
          countyCircles(polygonCounties, caseIndex, mode) {
            return polygonCounties.map(county => ({
              position: [county.polygon.centroid.x, county.polygon.centroid.y],
              radius: Math.sqrt(
                mode == "cases"
                  ? county.cases[caseIndex]
                  : county.deaths[caseIndex]
              ),
              county
            }));
          },
          polygonStates(states) {
            return states.filter(state => state.polygon.centroid != null);
          },
          stateRegions(polygonStates) {
            return polygonStates
              .map(state =>
                state.polygon.centroid.multipoly.map(poly => ({ poly, state }))
              )
              .flat(1);
          },
          textData(states, polygonCounties, caseIndex, maxCountyCases, mode) {
            return polygonCounties
              .filter(
                county =>
                  (mode == "cases"
                    ? county.cases[caseIndex]
                    : county.deaths[caseIndex]) > 0
              )
              .map(county => ({
                label: `${county.name} ${(mode == "cases"
                  ? county.cases[caseIndex]
                  : county.deaths[caseIndex]
                ).toLocaleString()}`,
                position: [
                  county.polygon.centroid.x,
                  county.polygon.centroid.y
                ],
                weight: Math.sqrt(
                  mode == "cases"
                    ? county.cases[caseIndex]
                    : county.deaths[caseIndex]
                )
              }))
              .concat(
                states.map(state => ({
                  label: state.shortcode,
                  position: [
                    state.polygon.centroid.x,
                    state.polygon.centroid.y
                  ],
                  weight: Math.sqrt(data.maxCountyCases)
                }))
              );
          },

          // Layers
          stateBgLayer(stateRegions) {
            return new PolygonLayer({
              id: "state-bg-regions",
              data: stateRegions,
              filled: true,
              stroked: false,
              getPolygon: d => d.poly,
              getFillColor: [255, 255, 255, 0],
              parameters: {
                depthTest: false
              },

              // Events
              pickable: true
              // onHover: info => console.log("state", info.object, info.x, info.y)
            });
          },
          countyLayer(countyRegions, maxCountyCases, showCounties) {
            return new PolygonLayer({
              id: "county-regions",
              data: countyRegions,
              getPolygon: d => d.poly,
              getLineColor: d => {
                if (d.value == 0) return [255, 255, 255, 0];
                let shade = Math.max(
                  Math.pow(d.value / maxCountyCases, 0.3) * 0.5,
                  0.08
                );
                shade = 255 - shade * 255;
                shade = shade == 255 ? 255 : Math.min(shade * 0.8, 255);
                return [shade, shade, shade, shade];
              },
              getFillColor: d => {
                if (d.value == 0) return [255, 255, 255, 0];
                let shade = Math.max(
                  Math.pow(d.value / maxCountyCases, 0.3) * 0.5,
                  0.08
                );
                shade = 255 - shade * 255;
                return [255, shade, shade];
              },
              opacity: showCounties ? 1 : 0,
              lineWidthMinPixels: 0.5,
              lineWidthMaxPixels: 0.5,
              extruded: false,
              parameters: {
                depthTest: false
              },

              // Events
              pickable: true,
              onHover: info => {
                console.log("county", info.object, info.x, info.y);
              },

              // Animation
              transitions: {
                getLineColor: TRANSITION,
                getFillColor: TRANSITION,
                opacity: TRANSITION
              }
            });
          },
          stateLayer(stateRegions) {
            return new PolygonLayer({
              id: "state-regions",
              data: stateRegions,
              filled: false,
              getPolygon: d => d.poly,
              getLineColor: [128, 128, 128],
              lineWidthMinPixels: 0.5,
              lineWidthMaxPixels: 0.5,
              parameters: {
                depthTest: false
              }
            });
          },
          circleLayer(countyCircles, effectiveCircleScale) {
            return new ScatterplotLayer({
              id: "county-circles",
              data: countyCircles,
              radiusScale: effectiveCircleScale / 100,
              stroked: true,
              getFillColor: [255, 0, 0, 51],
              getLineColor: [255, 0, 0, 204],
              lineWidthMinPixels: 0.5,
              lineWidthMaxPixels: 0.5,
              getRadius: d => (d.radius < 0.01 ? 0 : d.radius),
              parameters: {
                depthTest: false
              },
              transitions: {
                getRadius: TRANSITION
              },

              // Events
              pickable: true,
              onHover: info => {
                // console.log("circle", info.object, info.x, info.y);
              }
            });
          },
          textLayer(textData, showTextLabels) {
            return new TagmapLayer({
              id: "text-layer",
              data: textData,
              getLabel: x => x.label,
              getPosition: x => x.position,
              minFontSize: showTextLabels ? 10 : 0,
              maxFontSize: showTextLabels ? 14 : 0,
              colorScheme: [[0, 0, 0, 100]],
              weightThreshold: 50
            });
          },
          layers(
            stateBgLayer,
            countyLayer,
            stateLayer,
            circleLayer,
            textLayer
          ) {
            return [
              stateBgLayer,
              countyLayer,
              stateLayer,
              circleLayer,
              textLayer
            ];
          }
        }
      });
    }
  }

  onMount(async () => {
    data = new Data(await downloadData());
    const { deck, zoom } = initDeck();
    data.initialZoom = zoom;
    data.zoom = zoom;
    data.deck = deck;
    console.log("DATA", data);
    console.log("VIEWPORT", data.deck);
    loading = false;
  });

  function initDeck() {
    const screenWidth = windowWidth;
    const screenHeight = windowHeight;
    const scale = Math.min(
      screenWidth / data.width,
      screenHeight / data.height
    );
    const zoom = Math.log2(scale) - 0.1;
    console.log("ZM", zoom, scale);

    const deck = new Deck({
      parent: canvasElem,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      width: "100%",
      height: "100%",
      views: new OrthographicView({
        controller: { keyboard: false }
      }),
      initialViewState: {
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        target: [data.midX, data.midY],
        zoom,
        minZoom: -3,
        maxZoom: 8
      },
      onViewStateChange(e) {
        const zoom = e.zoom || e.viewState.zoom;
        data.zoom = zoom;
        if (e.hackyForceViewStateChange) {
          e.hackyCounter = hackyCounter++;
          deck.setProps({
            initialViewState: {
              ...e
            }
          });
          return;
        }

        panned = true;
        return;

        const { viewState } = e;
        const scale = Math.pow(2, viewState.zoom);
        const width = windowWidth * scale;
        const height = windowHeight * scale;
        const xMin = viewState.target[0] - width / 2 + 200;
        const xMax = viewState.target[0] + width / 2 - 200;
        const yMin = viewState.target[1] - height / 2 + 200;
        const yMax = viewState.target[1] + height / 2 - 200;
        console.log("XMIN", xMin, data.minX);

        let dx = 0;
        let dy = 0;
        if (xMax < data.minX) {
          dx = data.minX - xMax + 1;
        } else if (xMin > data.maxX) {
          dx = data.maxX - xMin - 1;
        }

        console.log("DX", dx);

        if (dx != 0 || dy != 0) {
          deck.setProps({
            viewState: {
              ...viewState.viewState,
              target: [viewState.target[0] + dx, viewState.target[1] + dy]
            }
          });
        }
      },
      getTooltip(info) {
        const { object } = info;
        if (object == null) return { style: { opacity: 0, display: "none" } };

        const getStateHtml = stateName => {
          return `<div class="block"><div class="type">State</div><div>${stateName}</div>
<p><b>${data.stateCases[stateName][data.caseIndex].toLocaleString()}</b> case${
            data.stateCases[stateName][data.caseIndex] == 1 ? "" : "s"
          }<br/>
<b>${data.stateDeaths[stateName][data.caseIndex].toLocaleString()}</b> death${
            data.stateDeaths[stateName][data.caseIndex] == 1 ? "" : "s"
          }</p></div>`;
        };

        if (object.state != null) {
          // Show state data
          return {
            html: getStateHtml(object.state.name),
            style: { opacity: 1, display: "block" }
          };
        }
        if (object.county != null) {
          // Show county data
          return {
            html: `<div class="block"><div class="type">County</div><div>${
              object.county.name
            }, ${object.county.state}</div>
<p><b>${object.county.cases[data.caseIndex].toLocaleString()}</b> case${
              object.county.cases[data.caseIndex] == 1 ? "" : "s"
            }<br/>
<b>${object.county.deaths[data.caseIndex].toLocaleString()}</b> death${
              object.county.deaths[data.caseIndex] == 1 ? "" : "s"
            }</p></div>${getStateHtml(object.county.state)}`,
            style: { opacity: 1, display: "block" }
          };
        }
      },
      layers: data.layers
    });
    return { deck, zoom };
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

  :global(.deck-tooltip) {
    @media only screen and (max-width: 600px) {
      display: none !important;
    }

    transition: opacity 0.5s ease;

    :global(.type) {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: bold;
    }

    :global(p) {
      margin: 5px 0;
    }

    :global(.block) {
      display: inline-block;
      margin: 0 5px;

      &:not(:first-child) {
        padding-left: 10px;
        margin-left: 10px;
        border-left: solid 1px rgba(255, 255, 255, 0.2);
      }
    }
  }

  .canvas {
    position: relative;
    width: 100%;
    height: 100%;
  }

  button {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(1px);
    padding: 5px;
    outline: none;
    border: solid 1px rgba(0, 0, 0, 0.1);
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 4;
  }
</style>

<Header {data} />
<div class="canvas" bind:this={canvasElem} />
{#if data != null && panned}
  <button on:click={resetZoom}>Reset</button>
{/if}
<Footer {data} />

<svelte:window
  bind:innerWidth={windowWidth}
  bind:innerHeight={windowHeight}
  on:resize={() => (panned = true)}
  on:keydown={e => {
    if (data == null) return;
    if (e.code == 'ArrowLeft') {
      data.caseIndex = Math.max(data.caseIndex - 1, 0);
    } else if (e.code == 'ArrowRight') {
      data.caseIndex = Math.min(data.caseIndex + 1, data.numDays - 1);
    }
  }} />
