import { Svue } from "svue";

// Deck.gl
import { ScatterplotLayer, PolygonLayer, ColumnLayer } from "@deck.gl/layers";
import TagmapLayer from "@/thirdparty/tagmap-layer";

const TRANSITION = {
  type: "spring"
};

const MAX_WEIGHT = 320;
const TEXT_SCALE_ADJUSTMENT = 400000;

export const allMetrics = [
  {
    key: 'cases',
    description: 'Cumulative number of confirmed cases',
    handlePlural(count) {
      return count == 1 ? 'total case' : 'total cases';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      return data.totalCases[i]
    },
    max(data) {
      return data.maxTotalCases
    },
    getCounty(_, county, i) {
      return county.cases[i];
    },
    getState(data, state, i) {
      return data.stateCases[state][i];
    },
    format(num) {
      return num.toLocaleString();
    }
  },
  {
    key: 'deaths',
    description: 'Cumulative number of deaths',
    handlePlural(count) {
      return count == 1 ? 'total death' : 'total deaths';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      return data.totalDeaths[i]
    },
    max(data) {
      return data.maxTotalDeaths
    },
    getCounty(_, county, i) {
      return county.deaths[i];
    },
    getState(data, state, i) {
      return data.stateDeaths[state][i];
    },
    format(num) {
      return num.toLocaleString();
    }
  },
  {
    key: 'casesPer100k',
    description: 'Cumulative cases per 100,000 people',
    handlePlural(count) {
      return Math.round(count) == 1 ? 'case per 100,000' : 'cases per 100,000';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      return data.totalCases[i] / data.totalPopulation * 100000;
    },
    max() {
      return 100000;
    },
    getCounty(_, county, i) {
      return county.cases[i] / county.stats.population * 100000;
    },
    getState(data, state, i) {
      return data.stateCases[state][i] / data.statesByName[state].stats.population * 100000;
    },
    format(num) {
      if (!isFinite(num)) return 'N/A';
      return Math.round(num).toLocaleString();
    }
  },
  {
    key: 'deathsPer100k',
    description: 'Cumulative deaths per 100,000 people',
    handlePlural(count) {
      return Math.round(count) == 1 ? 'death per 100,000' : 'deaths per 100,000';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      return data.totalDeaths[i] / data.totalPopulation * 100000;
    },
    max() {
      return 2000;
    },
    getCounty(_, county, i) {
      return county.deaths[i] / county.stats.population * 100000;
    },
    getState(data, state, i) {
      return data.stateDeaths[state][i] / data.statesByName[state].stats.population * 100000;
    },
    format(num) {
      if (!isFinite(num)) return 'N/A';
      return Math.round(num).toLocaleString();
    }
  },
  {
    key: 'newCases',
    description: 'New cases per day',
    handlePlural(count) {
      return count == 1 ? 'new case' : 'new cases';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const yesterday = i - 1 < 0 ? 0 : data.totalCases[i - 1];
      return Math.max(data.totalCases[i] - yesterday, 0);
    },
    max(data) {
      return Math.max(...data.totalCases.map((cases, i) => {
        const yesterday = i - 1 < 0 ? 0 : data.totalCases[i - 1];
        return Math.max(cases - yesterday, 0);
      }))
    },
    getCounty(_, county, i) {
      const yesterday = i - 1 < 0 ? 0 : county.cases[i - 1];
      return Math.max(county.cases[i] - yesterday, 0);
    },
    getState(data, state, i) {
      const cases = data.stateCases[state][i];
      const yesterday = i - 1 < 0 ? 0 : data.stateCases[state][i - 1];
      return Math.max(cases - yesterday, 0);
    },
    format(num) {
      return num.toLocaleString();
    }
  },
  {
    key: 'newDeaths',
    description: 'New deaths per day',
    handlePlural(count) {
      return count == 1 ? 'new death' : 'new deaths';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const yesterday = i - 1 < 0 ? 0 : data.totalDeaths[i - 1];
      return Math.max(data.totalDeaths[i] - yesterday, 0);
    },
    max(data) {
      return Math.max(...data.totalDeaths.map((cases, i) => {
        const yesterday = i - 1 < 0 ? 0 : data.totalDeaths[i - 1];
        return Math.max(cases - yesterday, 0);
      }))
    },
    getCounty(_, county, i) {
      const yesterday = i - 1 < 0 ? 0 : county.deaths[i - 1];
      return Math.max(county.deaths[i] - yesterday, 0);
    },
    getState(data, state, i) {
      const cases = data.stateDeaths[state][i];
      const yesterday = i - 1 < 0 ? 0 : data.stateDeaths[state][i - 1];
      return Math.max(cases - yesterday, 0);
    },
    format(num) {
      return num.toLocaleString();
    }
  },
  {
    key: 'newCasesWeek',
    description: 'New cases per week',
    handlePlural(count) {
      return count == 1 ? 'new case in a week' : 'new cases in a week';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const lastWeek = i - 7 < 0 ? 0 : data.totalCases[i - 7];
      return Math.max(data.totalCases[i] - lastWeek, 0);
    },
    max(data) {
      return Math.max(...data.totalCases.map((cases, i) => {
        const lastWeek = i - 7 < 0 ? 0 : data.totalCases[i - 7];
        return Math.max(cases - lastWeek, 0);
      }))
    },
    getCounty(_, county, i) {
      const lastWeek = i - 7 < 0 ? 0 : county.cases[i - 7];
      return Math.max(county.cases[i] - lastWeek, 0);
    },
    getState(data, state, i) {
      const cases = data.stateCases[state][i];
      const lastWeek = i - 7 < 0 ? 0 : data.stateCases[state][i - 7];
      return Math.max(cases - lastWeek, 0);
    },
    format(num) {
      return num.toLocaleString();
    }
  },
  {
    key: 'newDeathsWeek',
    description: 'New deaths per week',
    handlePlural(count) {
      return count == 1 ? 'new death in a week' : 'new deaths in a week';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const lastWeek = i - 7 < 0 ? 0 : data.totalDeaths[i - 7];
      return Math.max(data.totalDeaths[i] - lastWeek, 0);
    },
    max(data) {
      return Math.max(...data.totalDeaths.map((cases, i) => {
        const lastWeek = i - 7 < 0 ? 0 : data.totalDeaths[i - 7];
        return Math.max(cases - lastWeek, 0);
      }))
    },
    getCounty(_, county, i) {
      const lastWeek = i - 7 < 0 ? 0 : county.deaths[i - 7];
      return Math.max(county.deaths[i] - lastWeek, 0);
    },
    getState(data, state, i) {
      const cases = data.stateDeaths[state][i];
      const lastWeek = i - 7 < 0 ? 0 : data.stateDeaths[state][i - 7];
      return Math.max(cases - lastWeek, 0);
    },
    format(num) {
      return num.toLocaleString();
    }
  },
  {
    key: 'newCasesPer100k',
    description: 'New cases per day per 100,000',
    handlePlural(count) {
      return Math.round(count) == 1 ? 'new case per 100,000' : 'new cases per 100,000';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const yesterday = i - 1 < 0 ? 0 : data.totalCases[i - 1];
      return Math.max(data.totalCases[i] - yesterday, 0) / data.totalPopulation * 100000;
    },
    max() {
      return 20000;
    },
    getCounty(_, county, i) {
      const yesterday = i - 1 < 0 ? 0 : county.cases[i - 1];
      return Math.max(county.cases[i] - yesterday, 0) / county.stats.population * 100000;
    },
    getState(data, state, i) {
      const cases = data.stateCases[state][i];
      const yesterday = i - 1 < 0 ? 0 : data.stateCases[state][i - 1];
      return Math.max(cases - yesterday, 0) / data.statesByName[state].stats.population * 100000;
    },
    format(num) {
      return Math.round(num).toLocaleString();
    }
  },
  {
    key: 'newDeathsPer100k',
    description: 'New deaths per day per 100,000',
    handlePlural(count) {
      return Math.round(count) == 1 ? 'new death per 100,000' : 'new deaths per 100,000';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const yesterday = i - 1 < 0 ? 0 : data.totalDeaths[i - 1];
      return Math.max(data.totalDeaths[i] - yesterday, 0) / data.totalPopulation * 100000;
    },
    max() {
      return 5000;
    },
    getCounty(_, county, i) {
      const yesterday = i - 1 < 0 ? 0 : county.deaths[i - 1];
      return Math.max(county.deaths[i] - yesterday, 0) / county.stats.population * 100000;
    },
    getState(data, state, i) {
      const deaths = data.stateDeaths[state][i];
      const yesterday = i - 1 < 0 ? 0 : data.stateDeaths[state][i - 1];
      return Math.max(deaths - yesterday, 0) / data.statesByName[state].stats.population * 100000;
    },
    format(num) {
      return Math.round(num).toLocaleString();
    }
  },
  {
    key: 'newCasesPer100kWeek',
    description: 'New cases per day per 100,000 per week',
    handlePlural(count) {
      return Math.round(count) == 1 ? 'new case per 100,000 in a week' : 'new cases per 100,000 in a week';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const lastWeek = i - 7 < 0 ? 0 : data.totalCases[i - 7];
      return Math.max(data.totalCases[i] - lastWeek, 0) / data.totalPopulation * 100000;
    },
    max() {
      return 80000;
    },
    getCounty(_, county, i) {
      const lastWeek = i - 7 < 0 ? 0 : county.cases[i - 7];
      return Math.max(county.cases[i] - lastWeek, 0) / county.stats.population * 100000;
    },
    getState(data, state, i) {
      const cases = data.stateCases[state][i];
      const lastWeek = i - 7 < 0 ? 0 : data.stateCases[state][i - 7];
      return Math.max(cases - lastWeek, 0) / data.statesByName[state].stats.population * 100000;
    },
    format(num) {
      return Math.round(num).toLocaleString();
    }
  },
  {
    key: 'newDeathsPer100kWeek',
    description: 'New deaths per day per 100,000 per week',
    handlePlural(count) {
      return Math.round(count) == 1 ? 'new death per 100,000 in a week' : 'new deaths per 100,000 in a week';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      const lastWeek = i - 7 < 0 ? 0 : data.totalDeaths[i - 7];
      return Math.max(data.totalDeaths[i] - lastWeek, 0) / data.totalPopulation * 100000;
    },
    max() {
      return 5000;
    },
    getCounty(_, county, i) {
      const lastWeek = i - 7 < 0 ? 0 : county.deaths[i - 7];
      return Math.max(county.deaths[i] - lastWeek, 0) / county.stats.population * 100000;
    },
    getState(data, state, i) {
      const deaths = data.stateDeaths[state][i];
      const lastWeek = i - 7 < 0 ? 0 : data.stateDeaths[state][i - 7];
      return Math.max(deaths - lastWeek, 0) / data.statesByName[state].stats.population * 100000;
    },
    format(num) {
      return Math.round(num).toLocaleString();
    }
  },
  {
    key: 'deathrate',
    description: 'Rate of deaths relative to number of cases',
    handlePlural() {
      return 'death rate';
    },
    getTotal(data, i = null) {
      if (i == null) i = data.caseIndex;
      return data.totalCases[i] == 0 ? 0 : (data.totalDeaths[i] / data.totalCases[i]);
    },
    max() {
      return 100;
    },
    getCounty(_, county, i) {
      return county.cases[i] == 0 ? 0 : (county.deaths[i] / county.cases[i]);
    },
    getState(data, state, i) {
      return data.stateCases[state][i] == 0 ? 0 : (data.stateDeaths[state][i] / data.stateCases[state][i]);
    },
    format(num) {
      return `${(num * 100).toFixed(1)}%`;
    }
  },
];

// Thanks, https://medium.com/dailyjs/rewriting-javascript-converting-an-array-of-objects-to-an-object-ec579cafbfc7
export const metrics = Object.assign({}, ...allMetrics.map(item => ({ [item.key]: item })));

export class Data extends Svue {
  constructor(data, options = {}) {
    super({
      data() {
        return {
          ...data,
          deck: null,
          activeMetric: "cases",
          activeMetrics: ['cases', 'deaths'],
          caseIndex: data.numDays - 1,
          circleScale: 4000,
          threeD: options['3d'] || false,
          retainCircleSize: true,
          showTextLabels: true,
          initialZoom: 0,
          showCounties: true,
          showTooltips: true,
          normalizeCircles: true,
          countyMinPopFilter: -1,
          countyMaxPopFilter: 1000000000,
          countyMinCasesFilter: -1,
          countyMaxCasesFilter: 1000000000,
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
        countyFilter(countyMinPopFilter, countyMaxPopFilter, countyMinCasesFilter, countyMaxCasesFilter) {
          return (county, i) => county.stats.population >= countyMinPopFilter && county.stats.population <= countyMaxPopFilter && county.cases[i] >= countyMinCasesFilter && county.cases[i] <= countyMaxCasesFilter
        },
        metrics(activeMetrics) {
          return activeMetrics.map(x => metrics[x]);
        },
        metric(activeMetric) {
          return metrics[activeMetric];
        },
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
        countyRegions(polygonCounties, metric, countyFilter, caseIndex) {
          return polygonCounties
            .map(county =>
              county.polygon.centroid.multipoly.map(poly => ({
                poly,
                county,
                value:
                  // Apply filters
                  countyFilter(county, caseIndex) ?
                    metric.getCounty(this, county, caseIndex) : 0
              }))
            )
            .flat(1);
        },
        countyCircles(polygonCounties, caseIndex, normalizeCircles, countyFilter, metric) {
          return polygonCounties.map(county => ({
            position: [county.polygon.centroid.x, county.polygon.centroid.y],
            radius:
              // Apply filters
              countyFilter(county, caseIndex) ?
                Math.sqrt(
                  metric.getCounty(this, county, caseIndex) / (normalizeCircles ? metric.max(this) : 1)
                ) * (normalizeCircles ? MAX_WEIGHT : 1) : 0,
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
        textData(states, polygonCounties, caseIndex, normalizeCircles, maxTotalCases, countyFilter, metric) {
          return polygonCounties
            .filter(
              county =>
                // Apply filters
                (metric.getCounty(this, county, caseIndex)) > 0 && countyFilter(county, caseIndex)
            )
            .map(county => ({
              label: `${county.name} ${metric.format(metric.getCounty(this, county, caseIndex))}`,
              position: [
                county.polygon.centroid.x,
                county.polygon.centroid.y
              ],
              weight: Math.sqrt(
                metric.getCounty(this, county, caseIndex) / (normalizeCircles ? metric.max(this) : 1)
              ) * (normalizeCircles ? MAX_WEIGHT : 1) * TEXT_SCALE_ADJUSTMENT
            }))
            .concat(
              states.map(state => ({
                label: state.shortcode,
                position: [
                  state.polygon.centroid.x,
                  state.polygon.centroid.y
                ],
                weight: (normalizeCircles ? MAX_WEIGHT : maxTotalCases) * TEXT_SCALE_ADJUSTMENT
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
        countyLayer(countyRegions, normalizeCircles, metric, showCounties) {
          return new PolygonLayer({
            id: "county-regions",
            data: countyRegions,
            getPolygon: d => d.poly,
            getLineColor: d => {
              if (d.value == 0) return [255, 255, 255, 0];
              let shade = Math.max(
                Math.pow(d.value / (normalizeCircles ? metric.max(this) : 1), 0.3) * 0.5,
                0.08
              );
              shade = 255 - shade * 255;
              shade = shade == 255 ? 255 : Math.min(shade * 0.8, 255);
              return [shade, shade, shade, shade];
            },
            getFillColor: d => {
              if (d.value == 0) return [255, 255, 255, 0];
              let shade = Math.max(
                Math.pow(d.value / (normalizeCircles ? metric.max(this) : 1), 0.3) * 0.5,
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
            getFillColor: [255, 0, 0, 35],
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
        cylinderLayer(countyCircles) {
          return new ColumnLayer({
            id: "county-cylinders",
            data: countyCircles,
            diskResolution: 12,
            radius: 250,
            elevationScale: -500,
            // radiusScale: effectiveCircleScale / 100,
            extruded: true,
            getFillColor: d => [255, 0, 0, d.radius < 0.01 ? 0 : 235],
            getLineColor: [255, 0, 0, 204],
            lineWidthMinPixels: 0.5,
            lineWidthMaxPixels: 0.5,
            getElevation: d => (d.radius < 0.01 ? 0 : d.radius),
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
          cylinderLayer,
          textLayer,
          threeD,
        ) {
          return [
            stateBgLayer,
            countyLayer,
            stateLayer,
            threeD ? cylinderLayer : circleLayer,
            textLayer
          ];
        }
      }
    });
  }

  handlePlural(count) {
    return this.metric.handlePlural(count);
  }

  getTotal(i = null) {
    if (i == null) i = this.caseIndex;

    return this.metric.getTotal(this, i);
  }

  max() {
    return this.metric.max(this);
  }

  getCounty(county, i) {
    if (i == null) i = this.caseIndex;

    return this.metric.getCounty(this, county, i);
  }

  getState(state, i) {
    if (i == null) i = this.caseIndex;

    return this.metric.getState(this, state, i);
  }

  format(num) {
    return this.metric.format(num);
  }

  isActive(metric) {
    return this.activeMetric == metric.key;
  }

  setMetric(metric, add) {
    const fillIfNone = (metrics) => {
      // Set default metric if none is checked
      if (metrics.length == 0) {
        metrics = [allMetrics[0].key];
      }

      // Fix active metric if not set to anything
      if (!metrics.includes(this.activeMetric)) {
        this.activeMetric = metrics[0];
      }

      return metrics;
    };

    if (add) {
      if (!this.activeMetrics.includes(metric)) {
        this.activeMetrics = allMetrics.map(x => x.key).filter(x => [...this.activeMetrics, metric].includes(x));
      }
    } else {
      this.activeMetrics = fillIfNone(this.activeMetrics.filter(x => x != metric));
    }
  }
}
