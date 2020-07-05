<script>
  import Link from "@/router/Link";
  import SearchPane from "@/components/SearchPane";
  import DatePane from "@/components/DatePane";
  import MetricsPane from "@/components/MetricsPane";
  import SettingsPane from "@/components/SettingsPane";
  import Modal from "@/components/Modal";
  import Sparkline from "@/components/Sparkline";
  import { onMount, onDestroy } from "svelte";

  import { show, resetShow } from "@/show";

  // SVG assets
  import searchSvg from "@/assets/search.svg";
  import plusSvg from "@/assets/plus.svg";

  export let data = null;
  let showSearchPane = false;
  let playing = false;
  let playTimer = null;
  const PLAY_INTERVAL = 500;

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

  let showObj = {};
  let showUnsubscribe = null;
  onMount(() => {
    showUnsubscribe = show.subscribe(() => (showObj = show));
  });

  onDestroy(() => {
    if (showUnsubscribe != null) showUnsubscribe();
  });
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
    box-sizing: border-box;
    backdrop-filter: blur(1px);
    user-select: none;

    @media only screen and (max-width: 600px) {
      padding: 5px 5px;
    }

    > :global(*) {
      margin: 0 8px;
      display: inline-block;
      vertical-align: middle;
    }
  }

  .search {
    position: absolute;
    right: 0;
    width: 25px;
    top: 9px;
    cursor: pointer;

    @include on-hover {
      opacity: 0.7;
    }
  }

  .plus {
    position: absolute;
    right: 48px;
    top: 9px;
    width: 6px;
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
{:else if data != null && showObj.showMetrics}
  <MetricsPane {data} on:dismiss={() => (show.showMetrics = false)} />
{:else if data != null && showObj.showAll}
  <DatePane {data} on:dismiss={resetShow} />
{:else if data != null && showObj.showCounty}
  <DatePane {data} county={showObj.county} on:dismiss={resetShow} />
{:else if data != null && showObj.showState}
  <DatePane {data} state={showObj.state} on:dismiss={resetShow} />
{:else if data != null && showObj.showSettings}
  <SettingsPane {data} on:dismiss={() => (show.showSettings = false)} />
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
      <div class="plus" on:click={() => (show.showMetrics = true)}>
        {@html plusSvg}
      </div>
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
        <span class="block day" on:click={() => (show.showAll = true)}>
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
                show.showAll = true;
              } else {
                data.activeMetric = metric.key;
              }
            }}>
            {metric.format(metric.getTotal(data))}
            {metric.handlePlural(metric.getTotal(data))}
          </span>
        {/each}
      </div>
    {/if}
  </header>
{/if}
