<script>
  import Modal from "@/components/Modal";
  import Sparkline from "@/components/Sparkline";

  import { show } from "@/show";

  // SVG assets
  import plusSvg from "@/assets/plus.svg";

  export let data;
  export let county = null;
  export let state = null;

  let activeColumn = null;

  $: effectiveIndex = activeColumn == null ? data.caseIndex : activeColumn;

  $: getTotal = (metric, i) => {
    if (county == null && state == null) {
      return metric.getTotal(data, i);
    } else if (county != null) {
      return metric.getCounty(data, county, i);
    } else {
      return metric.getState(data, state, i);
    }
  };

  $: max = Math.max(
    ...[...Array($data.numDays).keys()].map(i => getTotal($data.metric, i))
  );

  let selectedState = show.showState
    ? show.state
    : show.showCounty
    ? show.county.state
    : "";
  let selectedCounty = show.showCounty ? show.county.name : "";

  $: {
    if (selectedState != "") {
      if (county != null && selectedState != county.state) {
        selectedCounty = "";
      } else if (county == null) {
        show.showAll = false;
        show.showState = true;
        show.showCounty = false;
        show.county = null;
        show.state = selectedState;
      }
    } else {
      show.showAll = true;
      show.showState = false;
      show.showCounty = false;
      show.county = null;
      show.state = null;
    }
  }

  $: {
    if (selectedCounty != "") {
      show.showAll = false;
      show.showState = false;
      show.showCounty = true;
      show.state = null;
      show.county = data.counties.filter(
        county => county.name == selectedCounty && county.state == selectedState
      )[0];
    } else {
      const showState = selectedState != "";
      show.showAll = !showState;
      show.showState = showState;
      show.showCounty = false;
      show.county = null;
      show.state = showState ? selectedState : null;
    }
  }
</script>

<style lang="scss">
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

    :global(svg) {
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

  .plus {
    display: inline-block;
    vertical-align: middle;
    font-size: 13px;
    cursor: pointer;
    padding: 5px 6px;
    border: solid 1px #c9c9c9;

    @include on-hover {
      background: rgba(0, 0, 0, 0.08);
    }

    > :global(*) {
      display: inline-block;
      vertical-align: middle;
    }
  }
</style>

<Modal on:dismiss>
  <div class="content">
    <h1>
      <span class="weekday">{data.dates[effectiveIndex].weekday}</span>
      <span class="date">{data.dates[effectiveIndex].text}</span>
    </h1>

    {#if county != null}
      <h3>{county.name}, {county.state}</h3>
    {:else if state != null}
      <h3>{state}</h3>
    {/if}

    <div class="stats">
      {#each data.metrics as metric}
        <div
          class="row"
          class:inactive={data.activeMetric != metric.key}
          on:click={() => (data.activeMetric = metric.key)}>
          <span class="num">
            {metric.format(getTotal(metric, effectiveIndex))}
          </span>
          {metric.handlePlural(getTotal(metric, effectiveIndex))}
        </div>
      {/each}
      <div class="plus" on:click={() => (show.showMetrics = true)}>
        <span>Add metric</span>
        {@html plusSvg}
      </div>
    </div>

    <div class="caption">
      {#if county == null && state == null}
        Total US
      {:else if county != null}
        {county.name}, {county.state}
      {:else if state != null}{state}{/if}
      <!-- Force plural -->
      {data.handlePlural(2)}
    </div>

    <div class="number pad">
      <div class="right">
        {data.format(getTotal(data.metric, data.numDays - 1))}
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
      <Sparkline {data} metric={data.metric} {county} {state} />
      {#each data.dates as date, i}
        <div
          class="circle"
          style="left: {(i / (data.numDays - 1)) * 100}%;top: {max == 0 ? 100 : (1 - getTotal(data.metric, i) / max) * 100}%" />
      {/each}
      <div class="number">
        <div class="left">{data.dates[0].text}</div>
        <div class="right">{data.dates[data.numDays - 1].text}</div>
      </div>
    </div>

    <h2>Data</h2>
    <div class="settings">
      {#if county == null && state == null}
        <div>
          <label>Show data for a specific state:</label>
          <select bind:value={selectedState}>
            <option value={''}>-------------</option>
            {#each $data.states as state}
              <option value={state.name}>{state.name}</option>
            {/each}
          </select>
        </div>
      {:else if state != null || county != null}
        <div>
          <label>Show data for a specific state:</label>
          <select bind:value={selectedState}>
            <option value={''}>-------------</option>
            {#each $data.states as state}
              <option value={state.name}>{state.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label>Show data for a specific county:</label>
          <select bind:value={selectedCounty}>
            <option value={''}>-------------</option>
            {#each $data.counties.filter(x => x.state == selectedState) as county}
              <option value={county.name}>{county.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
  </div>
</Modal>
