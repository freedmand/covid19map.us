<script>
  import Header from "@/components/Header";
  import Footer from "@/components/Footer";
  import { onMount } from "svelte";

  // Deck.gl
  import { Deck, COORDINATE_SYSTEM, OrthographicView } from "@deck.gl/core";

  // Data
  import {
    downloadData,
    DESIRED_MAX_CIRCLE_SIZE
  } from "@/processing/processCovidData";
  import { Data } from "@/data";

  let data = null;
  let loading = true;
  let canvasElem = null;
  let panned = false;

  // See https://github.com/uber/deck.gl/issues/4420
  let hackyCounter = 0;

  let windowWidth = 0;
  let windowHeight = 0;

  function resetZoom() {
    if (data == null) return;

    const screenWidth = windowWidth;
    const screenHeight = windowHeight;
    const scale = Math.min(
      screenWidth / data.width,
      screenHeight / data.height
    );
    const zoom = Math.log2(scale) - 0.2;
    data.initialZoom = zoom;
    data.zoom = zoom;

    data.deck._onViewStateChange({
      hackyForceViewStateChange: true,
      target: [data.midX, data.midY],
      zoom
    });
    panned = false;
  }

  onMount(async () => {
    data = new Data(await downloadData());
    const { deck, zoom } = initDeck();
    data.initialZoom = zoom;
    data.zoom = zoom;
    data.deck = deck;
    loading = false;
  });

  function initDeck() {
    const screenWidth = windowWidth;
    const screenHeight = windowHeight;
    const scale = Math.min(
      screenWidth / data.width,
      screenHeight / data.height
    );
    const zoom = Math.log2(scale) - 0.2;

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
        minZoom: -10,
        maxZoom: 1
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
      },
      getTooltip(info) {
        const { object } = info;
        if (object == null || !data.showTooltips) {
          if (info.x == -1 && info.y == -1) {
            return {
              style: {
                opacity: 0,
                transition: "none"
              }
            };
          }
          return { style: { opacity: 0, display: "none" } };
        }

        const getCountyHtml = county => {
          if (data.getCounty(county) == 0) return "";

          let html = `<div class="block"><div class="type">County</div><div>${county.name}, ${county.state}</div><p>`;

          for (let i = 0; i < data.metrics.length; i++) {
            const metric = data.metrics[i];
            const amount = metric.getCounty(data, county, data.caseIndex);
            html += `<div class="toolstat${
              data.isActive(metric) ? "" : " inactive"
            }"><b>${amount.toLocaleString()}</b> ${metric.handlePlural(
              amount
            )}</div>`;
          }

          html += "</p></div>";
          return html;
        };

        const getStateHtml = stateName => {
          let html = `<div class="block"><div class="type">State</div><div>${stateName}</div><p>`;

          for (let i = 0; i < data.metrics.length; i++) {
            const metric = data.metrics[i];
            const amount = metric.getState(data, stateName, data.caseIndex);
            html += `<div class="toolstat${
              data.isActive(metric) ? "" : " inactive"
            }"><b>${amount.toLocaleString()}</b> ${metric.handlePlural(
              amount
            )}</div>`;
          }

          html += "</p></div>";
          return html;
        };

        if (object.state != null) {
          // Show state data
          return {
            html: getStateHtml(object.state.name),
            style: {
              opacity: 1,
              display: "block",
              transition: "opacity 0.5s ease"
            }
          };
        }
        if (object.county != null) {
          // Show county data
          return {
            html: `${getCountyHtml(object.county)}${getStateHtml(
              object.county.state
            )}`,
            style: {
              opacity: 1,
              display: "block",
              transition: "opacity 0.5s ease"
            }
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

    :global(.inactive) {
      opacity: 0.7;
      font-size: 14px;
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
    bottom: 30px;
    right: 20px;
    z-index: 4;

    @media only screen and (max-width: 600px) {
      bottom: 40px;
    }
  }
</style>

<Header {data} />
<div class="canvas" bind:this={canvasElem} />
{#if data != null && panned}
  <button on:click={resetZoom}>Recenter</button>
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
