<script>
  import emitter from "@/emit";

  export let data;
  let activeColumn = null;

  $: effectiveIndex = activeColumn == null ? data.caseIndex : activeColumn;

  const emit = emitter({
    dismiss() {}
  });
</script>

<style lang="scss">
  .pane {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(1px);
    z-index: 10;
  }

  .close {
    margin: 10px;
    padding: 3px;
    font-size: 20px;
    line-height: 20px;
    width: 20px;
    text-align: center;
    display: inline-block;
    cursor: pointer;
    user-select: none;
    @include on-hover {
      background: rgba(0, 0, 0, 0.08);
    }
  }

  .content {
    position: absolute;
    left: 40px;
    right: 20px;
    top: 0;
    bottom: 0;
    overflow: auto;
    padding: 10px 20px;
  }

  .settings {
    padding-bottom: 100px;
    line-height: 24px;
  }

  h1 {
    > * {
      display: inline-block;
      vertical-align: baseline;
    }

    .weekday {
      font-size: 22px;
    }

    .date {
      font-weight: normal;
    }
  }

  .caption {
    font-size: 14px;
    text-align: right;
  }

  h2 {
    margin-top: 50px;
  }

  .svg {
    width: 100%;
    height: 50vh;
    max-height: 300px;
    position: relative;

    svg {
      display: block;
      overflow: visible;
      pointer-events: none;
    }
  }

  .circle {
    position: absolute;
    width: 5px;
    height: 5px;
    background: white;
    border: solid 2px black;
    border-radius: 5px;
    margin-left: -5px;
    margin-top: -5px;
    pointer-events: none;
  }

  .column {
    position: absolute;
    top: 0;
    height: 100%;
    background: transparent;
    cursor: pointer;

    @include on-hover {
      background: rgba(0, 0, 0, 0.051);
    }

    &.active {
      background: rgba(62, 74, 90, 0.67);
      mix-blend-mode: screen;

      @include on-hover {
        background: rgba(62, 74, 90, 0.67);
        mix-blend-mode: screen;
      }
    }
  }

  .number {
    margin-top: 8px;
    font-size: 12px;
    height: 15px;
    line-height: 15px;

    &.pad {
      padding-bottom: 10px;
    }

    .left {
      float: left;
      margin-left: -5px;
    }

    .right {
      float: right;
      margin-right: -5px;
    }
  }

  .stats {
    margin-top: -10px;
    padding: 4px 0;
    margin-left: -6px;
    margin-bottom: 27px;

    .row {
      padding: 4px 6px;
      font-size: 14px;
      display: inline-block;
      cursor: pointer;

      &.inactive {
        opacity: 0.5;
      }

      @include on-hover {
        background: rgba(0, 0, 0, 0.08);
      }

      .num {
        font-weight: bold;
        font-size: 18px;
      }
    }
  }

  .showdesktop {
    display: block;

    @media only screen and (max-width: 600px) {
      display: none;
    }
  }
</style>

<div class="pane">
  <span class="close" on:click={emit.dismiss}>&times;</span>
  <div class="content">
    <h1>
      <span class="weekday">{data.dates[effectiveIndex].weekday}</span>
      <span class="date">{data.dates[effectiveIndex].text}</span>
    </h1>

    <div class="stats">
      <div
        class="row"
        class:inactive={data.mode != 'cases'}
        on:click={() => (data.mode = 'cases')}>
        <span class="num">
          {data.totalCases[effectiveIndex].toLocaleString()}
        </span>
        {#if data.totalCases[effectiveIndex] == 1}case{:else}cases{/if}
      </div>
      <div
        class="row"
        class:inactive={data.mode != 'deaths'}
        on:click={() => (data.mode = 'deaths')}>
        <span class="num">
          {data.totalDeaths[effectiveIndex].toLocaleString()}
        </span>
        {#if data.totalDeaths[effectiveIndex] == 1}death{:else}deaths{/if}
      </div>
    </div>

    <div class="caption">
      Total US
      {#if data.mode == 'cases'}cases{:else}deaths{/if}
      per day
    </div>

    <div class="number pad">
      <div class="right">
        {(data.mode == 'cases' ? data.totalCases[data.numDays - 1] : data.totalDeaths[data.numDays - 1]).toLocaleString()}
      </div>
    </div>
    <div class="svg">
      {#each data.dates as date, i}
        <div
          class="column"
          class:active={i == data.caseIndex}
          on:mouseover={() => (activeColumn = i)}
          on:mouseout={() => (activeColumn = null)}
          on:click={() => (data.caseIndex = i)}
          style="left: {((i - 0.5) / (data.numDays - 1)) * 100}%; width: {(1 / data.numDays) * 100}%" />
      {/each}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1 1"
        preserveAspectRatio="none">
        <polyline
          points={data.dates
            .map((day, i) => `${i / (data.numDays - 1)},${1 - (data.mode == 'cases' ? data.totalCases[i] / data.maxTotalCases : data.totalDeaths[i] / data.maxTotalDeaths)}`)
            .concat(['1,1', '0,1'])
            .join(' ')}
          fill="rgba(255, 0, 0, 0.2)" />
        <polyline
          points={data.dates
            .map(
              (day, i) =>
                `${i / (data.numDays - 1)},${1 -
                  (data.mode == 'cases'
                    ? data.totalCases[i] / data.maxTotalCases
                    : data.totalDeaths[i] / data.maxTotalDeaths)}`
            )
            .join(' ')}
          vector-effect="non-scaling-stroke"
          fill="none"
          stroke="red"
          stroke-width="2" />
      </svg>
      {#each data.dates as date, i}
        <div
          class="circle"
          style="left: {(i / (data.numDays - 1)) * 100}%;top: {(1 - (data.mode == 'cases' ? data.totalCases[i] / data.maxTotalCases : data.totalDeaths[i] / data.maxTotalDeaths)) * 100}%" />
      {/each}
      <div class="number">
        <div class="left">{data.dates[0].text}</div>
        <div class="right">{data.dates[data.numDays - 1].text}</div>
      </div>
    </div>
    <h2>Settings</h2>
    <div class="settings">
      <div>
        <label>
          Show text labels
          <input type="checkbox" bind:checked={data.showTextLabels} />
        </label>
      </div>
      <div>
        <label>
          Show counties
          <input type="checkbox" bind:checked={data.showCounties} />
        </label>
      </div>
      <div class="showdesktop">
        <label>
          Show tooltips
          <input type="checkbox" bind:checked={data.showTooltips} />
        </label>
      </div>
      <div>
        <label>
          Decrease circle size with zoom
          <input type="checkbox" bind:checked={data.retainCircleSize} />
        </label>
      </div>
      <div>
        <label>
          Circle scaling
          <input type="range" min="0" max="100" bind:value={data.circleScale} />
        </label>
      </div>
    </div>
  </div>
</div>

<svelte:window on:keydown={e => e.key == 'Escape' && emit.dismiss()} />
