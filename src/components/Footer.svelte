<script>
  export let data;
</script>

<style lang="scss">
  footer {
    position: absolute;
    bottom: 0;
    padding: 5px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.4);

    > * {
      display: inline-block;
      vertical-align: middle;
      margin: 0 10px;
    }

    a {
      text-decoration: underline;
    }
  }
</style>

<footer>
  {#if data != null}
    <div>
      Data updated {data.lastUpdated}. Source:
      <a
        href="https://usafacts.org/visualizations/coronavirus-covid-19-spread-map/"
        target="_blank">
        USAFacts
      </a>
    </div>
  {/if}
</footer>
