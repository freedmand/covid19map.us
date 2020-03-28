<script>
  import Link from "@/router/Link";
  import DatePane from "@/components/DatePane";

  export let data = null;
  let showDatePane = false;
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
</script>

<style lang="scss">
  header {
    color: black;
    height: $headerHeight;
    line-height: $headerHeight;
    padding: 0 20px;
    font-size: 16px;
    position: absolute;
    top: 0;
    z-index: 2;
    text-shadow: 0 0 2px white;
    user-select: none;

    > :global(*) {
      margin: 0 8px;
      display: inline-block;
      vertical-align: middle;
    }
  }

  .showdesktop {
    display: inline-block;

    @media only screen and (max-width: 600px) {
      display: none;
    }
  }

  .day {
    display: inline-block;
    cursor: pointer;
    text-align: center;
    width: 120px;

    @include on-hover {
      background: rgba(0, 0, 0, 0.08);
    }
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

{#if showDatePane && data != null}
  <DatePane {data} on:dismiss={() => (showDatePane = false)} />
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
      <div>
        {#if data.caseIndex > 0}
          <span class="arrow action" on:click={() => (data.caseIndex = 0)}>
            &lt;&lt;
          </span>
          <span class="arrow action" on:click={() => data.caseIndex--}>
            &lt;
          </span>
        {/if}
        <span class="day" on:click={() => (showDatePane = true)}>
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
        <span
          class="day cases"
          class:inactive={data.mode != 'cases'}
          on:click={() => {
            if (data.mode == 'cases') {
              showDatePane = true;
            } else {
              data.mode = 'cases';
            }
          }}>
          {data.totalCases[data.caseIndex].toLocaleString()}
          {#if data.totalCases[data.caseIndex] == 1}case{:else}cases{/if}
        </span>
        <span
          class="day deaths"
          class:inactive={data.mode != 'deaths'}
          on:click={() => {
            if (data.mode == 'deaths') {
              showDatePane = true;
            } else {
              data.mode = 'deaths';
            }
          }}>
          {data.totalDeaths[data.caseIndex].toLocaleString()}
          {#if data.totalDeaths[data.caseIndex] == 1}death{:else}deaths{/if}
        </span>
      </div>
    {/if}
  </header>
{/if}
