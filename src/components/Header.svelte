<script>
  import Link from "@/router/Link";
  import SearchPane from "@/components/SearchPane";
  import DatePane from "@/components/DatePane";
  import MetricsPane from "@/components/MetricsPane";
  import Modal from "@/components/Modal";
  import Sparkline from "@/components/Sparkline";

  // SVG assets
  import searchSvg from "@/assets/search.svg";
  import plusSvg from "@/assets/plus.svg";

  export let data = null;
  let showDatePane = false;
  let showSearchPane = false;
  let playing = false;
  let playTimer = null;
  const PLAY_INTERVAL = 500;
  let showMetrics = false;

  function stop() {
    playing = false;
    if (playTimer != null) {
      clearTimeout(playTimer);
      playTimer = null;
    }
  }

  function autoIncrement() {
    if (data == null || !playing) return stop();

    if (data.caseIndex < data.numDays - 1) {
      data.caseIndex++;
      playTimer = setTimeout(autoIncrement, PLAY_INTERVAL);
    } else {
      return stop();
    }
  }

  function play() {
    playing = true;

    playTimer = setTimeout(autoIncrement, PLAY_INTERVAL);
  }
</script>

<style lang="scss">
  header {
    color: black;
    padding: 5px 20px;
    line-height: 20px;
    font-size: 16px;
    position: absolute;
    top: 0;
    z-index: 2;
    background: rgba(255, 255, 255, 0.5);
    width: 100%;
    backdrop-filter: blur(1px);
    user-select: none;

    > :global(*) {
      margin: 0 8px;
      display: inline-block;
      vertical-align: middle;
    }
  }

  .search {
    position: absolute;
    right: 0;
    width: 60px;
    top: 8px;
    cursor: pointer;

    @include on-hover {
      opacity: 0.7;
    }
  }

  .plus {
    display: inline-block;
    vertical-align: middle;
    width: 85px;
    cursor: pointer;

    @include on-hover {
      opacity: 0.8;
    }
  }

  .showdesktop {
    display: inline-block;

    @media only screen and (max-width: 600px) {
      display: none;
    }
  }

  .block {
    display: inline-block;
    cursor: pointer;
    text-align: center;

    @include on-hover {
      background: rgba(0, 0, 0, 0.08);
    }
  }

  .day {
    width: 120px;
  }

  .metric {
    padding: 0 5px;
    position: relative;
  }

  .action {
    cursor: pointer;

    @include on-hover {
      text-decoration: underline;
    }

    &.arrow {
      font-size: 13px;
      width: 19px;
      display: inline-block;
      text-align: center;
    }
  }

  .inactive {
    opacity: 0.5;
  }
</style>

{#if data != null && showSearchPane}
  <SearchPane {data} on:dismiss={() => (showSearchPane = false)} />
{:else if data != null && showDatePane}
  <DatePane {data} on:dismiss={() => (showDatePane = false)} />
{:else if data != null && showMetrics}
  <MetricsPane {data} on:dismiss={() => (showMetrics = false)} />
{:else}
  <header>
    <div class="showdesktop">
      <Link to="home">
        <b>Covid19Map.us</b>
      </Link>
    </div>
    {#if data == null}
      <div>Loading...</div>
    {:else}
      <div class="search" on:click={() => (showSearchPane = true)}>
        {@html searchSvg}
      </div>
      <div>
        {#if data.caseIndex > 0}
          <span class="arrow action" on:click={() => (data.caseIndex = 0)}>
            &lt;&lt;
          </span>
          <span class="arrow action" on:click={() => data.caseIndex--}>
            &lt;
          </span>
        {/if}
        <span class="block day" on:click={() => (showDatePane = true)}>
          {data.dates[data.caseIndex].weekday}, {data.dates[data.caseIndex].text}
        </span>
        {#if data.caseIndex < data.numDays - 1}
          <span class="arrow action" on:click={() => data.caseIndex++}>
            &gt;
          </span>
          <span
            class="action"
            on:click={() => (data.caseIndex = data.numDays - 1)}>
            &gt;&gt;
          </span>
        {/if}
      </div>
      <div>
        {#each data.metrics as metric}
          <span
            class="block metric"
            class:inactive={data.activeMetric != metric.key}
            on:click={() => {
              if (data.isActive(metric)) {
                showDatePane = true;
              } else {
                data.activeMetric = metric.key;
              }
            }}>
            {metric.getTotal(data).toLocaleString()}
            {metric.handlePlural(metric.getTotal(data))}
          </span>
        {/each}
        <span class="plus" on:click={() => (showMetrics = true)}>
          {@html plusSvg}
        </span>
      </div>
    {/if}
  </header>
{/if}
