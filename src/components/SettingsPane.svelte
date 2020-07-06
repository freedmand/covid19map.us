<script>
  import Modal from "@/components/Modal";
  import { allMetrics } from "@/data";
  import Sparkline from "@/components/Sparkline";
  import emitter from "@/emit";

  const emit = emitter({
    dismiss() {}
  });

  export let data;
</script>

<style lang="scss">
  .showdesktop {
    display: block;

    @media only screen and (max-width: 600px) {
      display: none;
    }
  }

  .settings {
    > div {
      margin: 10px 0;
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
        Normalize circle size
        <input type="checkbox" bind:checked={data.normalizeCircles} />
      </label>
    </div>
    <div>
      <label>
        Only color counties with more new cases/deaths
        <br />
        on a given day compared to the previous day
        <input type="checkbox" bind:checked={data.increaseMode} />
      </label>
    </div>
    <div>
      <label>
        Circle scaling
        <input
          type="range"
          min="0"
          max="100000"
          bind:value={data.circleScale} />
      </label>
    </div>
  </div>

  <button on:click={emit.dismiss}>Ok</button>
</Modal>
