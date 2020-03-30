import { Svue } from "svue";

// Deck.gl
import { ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
import TagmapLayer from "@/thirdparty/tagmap-layer";

const TRANSITION = {
  type: "spring"
};

export class Data extends Svue {
  constructor(data) {
    super({
      data() {
        return {
          ...data,
          deck: null,
          mode: "cases",
          caseIndex: data.numDays - 1,
          circleScale: 4000,
          retainCircleSize: true,
          showTextLabels: true,
          initialZoom: 0,
          showCounties: true,
          showTooltips: true,
          zoom: 0
        };
      },
      watch: {
        layers() {
          if (this.deck != null) {
            this.deck.setProps({ layers: this.layers });
          }
        },
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
              ) * 400000
            }))
            .concat(
              states.map(state => ({
                label: state.shortcode,
                position: [
                  state.polygon.centroid.x,
                  state.polygon.centroid.y
                ],
                weight: Math.sqrt(data.maxCountyCases) * 400000
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
            pickable: true
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
