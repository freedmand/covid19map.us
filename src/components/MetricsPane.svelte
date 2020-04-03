<script>
  import Modal from "@/components/Modal";
  import { allMetrics } from "@/data";
  import Sparkline from "@/components/Sparkline";
  import emitter from "@/emit";

  const emit = emitter({
    dismiss() {}
  });

  export let data;

  function titleCase(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  }
</script>

<style lang="scss">
  h1 {
    font-size: 22px;
    font-weight: normal;
  }

  .shell {
    label {
      cursor: pointer;

      > * {
        display: inline-block;
        vertical-align: middle;
      }

      input {
        margin-right: 5px;
      }
    }
  }

  .metric {
    margin: 7px 0;
    padding: 5px 10px;
    border: solid 1px rgba(0, 0, 0, 0.5);
    width: calc(100% - 80px);
    background: rgba(255, 255, 255, 0.7);
    max-width: 600px;
    user-select: none;

    :global(svg) {
      height: 30px;
    }

    @include on-hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .description {
      color: rgba(0, 0, 0, 0.7);
      font-size: 14px;
      margin-top: 2px;
    }
  }

  button {
    margin: 20px 0 40px 0;
    background: white;
    border: solid 1px gainsboro;
    outline: none;
    padding: 5px 10px;
    font-size: 14px;
  }

  .filter {
    margin: 7px 0;
    padding: 0 20px 15px 24px;
    border: solid 1px rgba(0, 0, 0, 0.5);
    width: calc(100% - 80px);
    background: rgba(255, 255, 255, 0.7);
    max-width: 600px;
    user-select: none;

    .option {
      padding: 5px 0;
    }
  }
</style>

<Modal on:dismiss>
  <h1>Metrics</h1>

  <p>Select metrics below to add or remove them from the default display.</p>

  {#each allMetrics as metric}
    <div class="shell">
      <label>
        <input
          type="checkbox"
          checked={$data.activeMetrics.includes(metric.key)}
          disabled={$data.activeMetrics.includes(metric.key) && $data.activeMetrics.length == 1}
          on:change={e => data.setMetric(metric.key, e.target.checked)} />
        <div class="metric">
          <div class="title">{titleCase(metric.handlePlural(2))}</div>
          <div class="description">{metric.description}</div>
          <Sparkline {data} {metric} />
        </div>
      </label>
    </div>
  {/each}
  <h1>Filters</h1>
  <p>
    Apply filters to restrict the data. Only counties that pass all the
    specified filters will be shown.
  </p>
  <div class="filter">
    <p>
      <b>Show counties with at least the specified population</b>
    </p>
    <div class="option">
      <label>
        <input type="radio" bind:group={$data.countyMinPopFilter} value={-1} />
        Show all counties
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinPopFilter}
          value={100000} />
        Only show counties with population of at least 100,000
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinPopFilter}
          value={200000} />
        Only show counties with population of at least 200,000
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinPopFilter}
          value={500000} />
        Only show counties with population of at least 500,000
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinPopFilter}
          value={1000000} />
        Only show counties with population of at least 1,000,000
      </label>
    </div>
  </div>
  <div class="filter">
    <p>
      <b>Show counties with at most the specified population</b>
    </p>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxPopFilter}
          value={1000000000} />
        Show all counties
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxPopFilter}
          value={100000} />
        Only show counties with population at most 100,000
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxPopFilter}
          value={200000} />
        Only show counties with population at most 200,000
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxPopFilter}
          value={500000} />
        Only show counties with population at most 500,000
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxPopFilter}
          value={1000000} />
        Only show counties with population at most 1,000,000
      </label>
    </div>
  </div>

  <div class="filter">
    <p>
      <b>Show counties with at least the specified cases</b>
    </p>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinCasesFilter}
          value={-1} />
        Show all counties
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinCasesFilter}
          value={100} />
        Only show counties with at least 100 cases
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinCasesFilter}
          value={500} />
        Only show counties with at least 500 cases
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinCasesFilter}
          value={1000} />
        Only show counties with at least 1,000 cases
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMinCasesFilter}
          value={2000} />
        Only show counties with at least 2,000 cases
      </label>
    </div>
  </div>

  <div class="filter">
    <p>
      <b>Show counties with at most the specified cases</b>
    </p>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxCasesFilter}
          value={1000000000} />
        Show all counties
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxCasesFilter}
          value={100} />
        Only show counties with at most 100 cases
      </label>
    </div>

    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxCasesFilter}
          value={500} />
        Only show counties with at most 500 cases
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxCasesFilter}
          value={1000} />
        Only show counties with at most 1,000 cases
      </label>
    </div>
    <div class="option">
      <label>
        <input
          type="radio"
          bind:group={$data.countyMaxCasesFilter}
          value={2000} />
        Only show counties with at most 2,000 cases
      </label>
    </div>
  </div>
  <button on:click={emit.dismiss}>Ok</button>
</Modal>
