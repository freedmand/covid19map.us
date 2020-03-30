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
</style>

<Modal on:dismiss>
  <h1>Metrics</h1>

  <p>Select metrics below to add or remove them from the default display.</p>

  {#each allMetrics as metric}
    <div class="shell">
      <label>
        <input
          type="checkbox"
          checked={data.activeMetrics.includes(metric.key)}
          on:change={e => data.setMetric(metric.key, e.target.checked)} />
        <div class="metric">
          <div class="title">{titleCase(metric.handlePlural(2))}</div>
          <div class="description">{metric.description}</div>
          <Sparkline {data} {metric} />
        </div>
      </label>
    </div>
  {/each}
  <button on:click={emit.dismiss}>Ok</button>
</Modal>
