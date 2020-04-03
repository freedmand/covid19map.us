<script>
  import Modal from "@/components/Modal";
  import Sparkline from "@/components/Sparkline";
  import { onMount } from "svelte";
  import emitter from "@/emit";

  const emit = emitter({
    dismiss() {}
  });

  export let data;
  let windowWidth = 0;
  let windowHeight = 0;

  let text = "";
  let input;

  onMount(() => {
    if (input != null) input.focus();
  });

  function searchScore(name, inputText) {
    name = name.toLowerCase();
    inputText = inputText.toLowerCase();
    let score = 0;
    let lastPos = 0;
    const highlights = [];

    for (let i = 0; i < inputText.length; i++) {
      const char = inputText.charAt(i);
      const idx = name.indexOf(char, lastPos);
      if (idx == -1) {
        score -= 1;
      } else {
        score += 1 / (idx - lastPos + 1);
        highlights.push(idx);
        lastPos = idx + 1;
      }
    }
    return { score, highlights };
  }

  function getSearchResults(text) {
    text = text.toLowerCase();
    resultsAmount = 20;
    return data.counties
      .filter(county => data.countyFilter(county, data.caseIndex))
      .map(county => {
        const countyName = `${county.name}, ${county.state}`;
        let { score, highlights } = searchScore(countyName, text);
        // Tie breaker
        let result = data.getCounty(county);
        if (!isFinite(result)) result = -1;
        score += result / data.max();
        return { county, countyName, score, highlights };
      })
      .sort((a, b) => b.score - a.score);
  }

  let resultsAmount = 20;

  $: allResults = getSearchResults(text);
  $: results = allResults.slice(0, resultsAmount);

  // Handle zoom
  function zoomToCounty(county) {
    if (data == null) return;

    let xMin = null;
    let xMax = null;
    let yMin = null;
    let yMax = null;
    for (let i = 0; i < county.polygon.coords.length; i += 2) {
      const x = county.polygon.coords[i];
      const y = county.polygon.coords[i + 1];
      if (xMin == null || x < xMin) {
        xMin = x;
      }
      if (xMax == null || x > xMax) {
        xMax = x;
      }
      if (yMin == null || y < yMin) {
        yMin = y;
      }
      if (yMax == null || y > yMax) {
        yMax = y;
      }
    }
    const width = xMax - xMin;
    const height = yMax - yMin;

    const screenWidth = windowWidth;
    const screenHeight = windowHeight;
    const scale = Math.min(screenWidth / width, screenHeight / height);
    const zoom = Math.log2(scale) - 0.3;
    data.zoom = zoom;

    data.deck._onViewStateChange({
      hackyForceViewStateChange: true,
      target: [xMin + width / 2, yMin + height / 2],
      zoom
    });
    emit.dismiss();
  }
</script>

<style lang="scss">
  h1 {
    font-size: 22px;
    font-weight: normal;
  }

  input {
    width: 100%;
    max-width: 600px;
    font-size: 17px;
    padding: 5px 10px;
    box-sizing: border-box;
    outline: none;
  }

  .results {
    margin: 10px 0;

    .result {
      position: relative;
      padding: 5px 10px;
      border: solid 1px rgba(0, 0, 0, 0.12);
      background: rgba(255, 255, 255, 0.7);
      margin: 11px 0;
      user-select: none;
      cursor: pointer;
      @include on-hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .text {
        margin-left: 9px;
      }

      .metric {
        color: rgba(0, 0, 0, 0.7);
        font-size: 14px;
        margin-top: 2px;
      }

      > :global(*) {
        display: inline-block;
        vertical-align: middle;
      }

      :global(svg) {
        width: 120px;
        height: 30px;
      }
    }
  }

  button {
    margin-bottom: 40px;
    background: white;
    border: solid 1px gainsboro;
    outline: none;
    padding: 5px 10px;
    font-size: 14px;
  }
</style>

<Modal on:dismiss>
  <h1>Search</h1>

  <input
    type="text"
    bind:this={input}
    bind:value={text}
    placeholder="Type in a county, e.g. Cook, Illinois" />

  <div class="results">
    {#each results as { county, countyName, highlights }}
      <div class="result" on:click={() => zoomToCounty(county)}>
        <Sparkline {data} metric={data.metric} {county} />
        <div class="text">
          <div class="name">
            {#each countyName as c, i}
              {#if highlights.includes(i)}
                <b>{c}</b>
              {:else}{c}{/if}
            {/each}
          </div>
          <div class="metric">
            {data.format(data.getCounty(county))}
            {data.handlePlural(data.getCounty(county))}
          </div>
        </div>
      </div>
    {/each}
  </div>
  {#if resultsAmount < allResults.length}
    <button on:click={() => (resultsAmount += 20)}>Show more</button>
  {/if}
</Modal>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />
