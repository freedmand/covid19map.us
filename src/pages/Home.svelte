<script>
  import Header from "@/components/Header";
  import { Svue } from "svue";
  import { Deck } from "@deck.gl/core";
  import { ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
  import { HeatmapLayer } from "@deck.gl/aggregation-layers";
  import { COORDINATE_SYSTEM, OrthographicView } from "@deck.gl/core";
  import {
    downloadData,
    DESIRED_MAX_CIRCLE_SIZE
  } from "@/processing/processCovidData";
  import { onMount, tick } from "svelte";
  import { cubicOut } from "svelte/easing";
  import TagmapLayer from "@/thirdparty/tagmap-layer";

  let data = null;
  let loading = true;
  let casesElem = null;
  let canvasElem = null;

  $: {
    if (data != null && casesElem != null) {
      casesElem.children[data.caseIndex].scrollIntoView();
    }
  }

  let caseIndex = 0;

  const TRANSITION = {
    type: "spring"
  };

  class Data extends Svue {
    constructor(data) {
      super({
        data() {
          return { ...data, deck: null, caseIndex: 0 };
        },
        watch: {
          layers() {
            if (this.deck != null) {
              console.log("animating");
              this.deck.setProps({ layers: this.layers });
            }
          },
          caseIndex() {
            console.log("CASE INDEX", casesElem, this.caseIndex);
            if (casesElem != null) {
              casesElem.children[this.caseIndex].scrollIntoView();
            }
          }
        },
        computed: {
          minX(bounds) {
            return bounds[0];
          },
          maxX(bounds) {
            return bounds[3];
          },
          minY(bounds) {
            return bounds[1];
          },
          maxY(bounds) {
            return bounds[2];
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
          countyRegions(polygonCounties, caseIndex) {
            return polygonCounties
              .map(county =>
                county.polygon.centroid.multipoly.map(poly => ({
                  poly,
                  county,
                  value: county.cases[caseIndex]
                }))
              )
              .flat(1);
          },
          countyCircles(polygonCounties, caseIndex) {
            return polygonCounties.map(county => ({
              position: [county.polygon.centroid.x, county.polygon.centroid.y],
              radius: Math.sqrt(county.cases[caseIndex]),
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
          textData(states, polygonCounties, caseIndex, maxCountyCases) {
            return polygonCounties
              .filter(county => county.cases[caseIndex] > 0)
              .map(county => ({
                label: `${county.name} ${county.cases[caseIndex]}`,
                position: [
                  county.polygon.centroid.x,
                  county.polygon.centroid.y
                ],
                weight: Math.sqrt(county.cases[caseIndex])
              }))
              .concat(
                states.map(state => ({
                  label: state.name,
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
          countyLayer(countyRegions, maxCountyCases) {
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
                getFillColor: TRANSITION
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
          circleLayer(countyCircles) {
            return new ScatterplotLayer({
              id: "county-circles",
              data: countyCircles,
              radiusScale: 0.5,
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
          textLayer(textData) {
            console.log("GOT TEXT DATA", textData);
            return new TagmapLayer({
              id: "text-layer",
              data: textData,
              getLabel: x => x.label,
              getPosition: x => x.position,
              minFontSize: 10,
              maxFontSize: 14,
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
    data.deck = initDeck();
    console.log("DATA", data);
    console.log("VIEWPORT", data.deck);
    await tick();
    data.caseIndex = data.numDays - 1;
    loading = false;
  });

  function initDeck() {
    console.log(canvasElem);
    return new Deck({
      parent: canvasElem,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      width: "100%",
      height: "100%",
      views: new OrthographicView({ controller: { keyboard: false } }),
      initialViewState: {
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        x: data.midX,
        y: data.midY
      },
      layers: data.layers
    });
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
    position: relative;
    width: 100%;
    height: calc(100% - #{$headerHeight});
  }

  .dates {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: $datesHeight;
    overflow-x: scroll;
    overflow-y: hidden;
    white-space: nowrap;
    -ms-overflow-style: none;
    backdrop-filter: blur(1px);
    box-shadow: 0 0 2px #00000026;

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
          background: #ffe3e3;
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
        background: #ffe3e3;

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
<div class="canvas" bind:this={canvasElem} />
{#if loading}
  Loading...
{:else}
  <div class="dates" bind:this={casesElem}>
    {#each data.dates as { text, weekday }, i}
      <div
        class="date"
        class:selected={data.caseIndex == i}
        on:click={() => (data.caseIndex = i)}>
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
      data.caseIndex = Math.max(data.caseIndex - 1, 0);
    } else if (e.code == 'ArrowRight') {
      data.caseIndex = Math.min(data.caseIndex + 1, data.numDays - 1);
    }
  }} />
