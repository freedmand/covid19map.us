<script>
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

  let data = null;
  let loading = true;

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
                  value: county.cases[caseIndex]
                }))
              )
              .flat(1);
          },
          countyCircles(polygonCounties, caseIndex) {
            return polygonCounties.map(county => ({
              position: [county.polygon.centroid.x, county.polygon.centroid.y],
              radius: Math.sqrt(county.cases[caseIndex])
            }));
          },
          polygonStates(states) {
            return states.filter(state => state.polygon.centroid != null);
          },
          stateRegions(polygonStates) {
            return polygonStates
              .map(state => state.polygon.centroid.multipoly)
              .flat(1);
          },

          // Layers
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
              getPolygon: d => d,
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
              }
            });
          },
          layers(countyLayer, stateLayer, circleLayer) {
            return [countyLayer, stateLayer, circleLayer];
          }
        }
      });
    }
  }

  onMount(async () => {
    data = new Data(await downloadData());
    data.deck = initDeck();
    loading = false;
  });

  function initDeck() {
    return new Deck({
      container: document.body,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      width: "100vw",
      height: "100vh",
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

{#if loading}
  Loading...
{:else}
  <button
    style="position: fixed;z-index:10"
    on:click={() => {
      data.caseIndex = data.numDays - 1;
      console.log('clicked', data.caseIndex);
    }}>
    Change props
  </button>
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
