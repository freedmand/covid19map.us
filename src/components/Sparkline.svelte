<script>
  export let data;
  export let metric;
  export let includeFill = true;
  export let county = null;
  export let state = null;

  function getAccessor() {
    if (county != null) {
      return (metric, i) => metric.getCounty(data, county, i);
    } else if (state != null) {
      return (metric, i) => metric.getState(data, state, i);
    } else {
      return (metric, i) => metric.getTotal(data, i);
    }
  }

  // Always get accessor
  $: accessor =
    data != null || state != null || county != null
      ? getAccessor()
      : getAccessor();

  $: points = [...Array(data.numDays).keys()].map(i => accessor(metric, i));
  $: max = Math.max(...points);
</script>

<svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
  {#if includeFill}
    <polyline
      points={points
        .map((point, i) => `${i / (data.numDays - 1)},${1 - points[i] / max}`)
        .concat(['1,1', '0,1'])
        .join(' ')}
      fill="rgba(255, 0, 0, 0.2)" />
  {/if}
  <polyline
    points={points
      .map((point, i) => `${i / (data.numDays - 1)},${1 - points[i] / max}`)
      .join(' ')}
    vector-effect="non-scaling-stroke"
    fill="none"
    stroke="red"
    stroke-width="2" />
</svg>
