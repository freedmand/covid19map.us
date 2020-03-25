<script>
  export let data;
  let casesElem = null;
  let childPoints = "";
  let childCenters = [];
  let svgBounds = {};

  $: {
    if (data != null && casesElem != null) {
      casesElem.children[data.caseIndex].scrollIntoView();
      updateChildPoints();
    }
  }

  const CIRCLE_RADIUS = 5;
  const CIRCLE_STROKE = 2;

  function updateChildPoints() {
    let points = "";
    const centers = [];

    let minX = null;
    let minY = null;
    let maxX = null;
    let maxY = null;

    for (let i = 0; i < casesElem.children.length; i++) {
      const child = casesElem.children[i];
      const bounds = child.getBoundingClientRect();
      const x = bounds.left + bounds.width / 2;
      const y =
        bounds.bottom -
        bounds.height * (data.totalCases[i] / data.maxTotalCases);
      points += `${x},${y} `;
      centers.push([x, y]);

      if (minX == null || bounds.left < minX) minX = bounds.left;
      if (maxX == null || bounds.right > maxX) maxX = bounds.right;
      if (minY == null || bounds.top < minY) minY = bounds.top;
      if (maxY == null || bounds.bottom > maxY) maxY = bounds.bottom;
    }
    childPoints = points;
    childCenters = centers;

    const width = maxX - minX;
    const height = maxY - minY;
    const desiredHeight = height + (CIRCLE_RADIUS + CIRCLE_STROKE) * 2;
    const desiredWidth = (desiredHeight / height) * width;
    svgBounds = {
      minX,
      maxX,
      minY: minY - CIRCLE_RADIUS - CIRCLE_STROKE,
      maxY: maxY + CIRCLE_RADIUS + CIRCLE_STROKE,
      width: desiredWidth,
      height: desiredHeight
    };
  }
</script>

<style lang="scss">
  .dates {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: $datesHeight;
    overflow-x: scroll;
    overflow-y: hidden;
    white-space: nowrap;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }

    .date {
      display: inline-block;
      height: $datesHeight;
      text-align: center;
      padding: 3px 15px 0 15px;
      box-sizing: border-box;
      color: rgba(0, 0, 0, 0.6);
      position: relative;
      user-select: none;

      @include on-hover {
        background: rgba(0, 0, 0, 0.05);
        cursor: pointer;
      }

      .text {
        color: black;
        mix-blend-mode: hard-light;
        text-shadow: 0 0 2px white;
        z-index: 1;
      }

      .dateregion {
        text-align: left;

        > * {
          display: inline-block;
          vertical-align: bottom;
        }

        .weekday {
          font-weight: bold;
          font-size: 12px;
        }

        .day {
          font-size: 12px;
        }
      }

      .cases {
        padding: 0;
        font-weight: bold;
        font-size: 14px;
      }

      .casestext {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
    }

    svg {
      position: absolute;
      top: 0;
      left: 0;
      background: none;
    }
  }
</style>

<div class="dates" bind:this={casesElem}>
  {#if casesElem != null}
    <svg
      width={svgBounds.width}
      height={svgBounds.height}
      viewBox="{svgBounds.minX}
      {svgBounds.minY}
      {svgBounds.width}
      {svgBounds.height}">
      <polyline
        points={childPoints}
        fill="none"
        stroke="red"
        stroke-width="2" />
      {#each childCenters as center}
        <circle
          cx={center[0]}
          cy={center[1]}
          r={CIRCLE_RADIUS}
          stroke="black"
          fill="white"
          stroke-width={CIRCLE_STROKE} />
      {/each}
    </svg>
  {/if}
  {#each data.dates as { text, weekday }, i}
    <div
      class="date"
      class:selected={data.caseIndex == i}
      on:click={() => (data.caseIndex = i)}>
      <div class="text">
        <div class="dateregion">
          <div class="weekday">{weekday}</div>
          <div class="day">{text}</div>
        </div>
        <div class="cases">{data.totalCases[i].toLocaleString()}</div>
        <div class="casestext">cases</div>
      </div>
    </div>
  {/each}
</div>
