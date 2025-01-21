<script>
    import * as d3 from "d3";
  
    // Receive plot data as prop.
    export let data = [{price: 0, timestamp: 0}];
  
    // The chart dimensions and margins as optional props.
    export let width = 928;
    export let height = 500;
    export let marginTop = 40;
    export let marginRight = 50;
    export let marginBottom = 50;
    export let marginLeft = 50;
    export let title = "Market";
  
    $: if (!data || data.length === 0 || data === undefined || data.price == NaN|| data.timestamp === NaN) {
      data = []
    }

    // Create the x (horizontal position) scale.
    $: xScale = d3.scaleLinear(
      d3.extent(data, (d) => new Date(d.timestamp)),
      [marginLeft, width - marginRight]
    );

    // Create the y (vertical position) scale.
    $: yScale = d3.scaleLinear(
      [0, d3.max(data, (d) => d.price * 1.1)],
      [height - marginBottom, marginTop]
    );

    // Create the line generator.
    $: line = d3
      .line()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.price));
  </script>
  
  <svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    style:max-width="100%"
    style:height="auto"
  >
    <!-- X-Axis -->
    <g transform="translate(0,{height - marginBottom})">
      <line stroke="white" x1={marginLeft - 6} x2={width - 40} />
  
      {#each xScale.ticks() as tick}
        <!-- X-Axis Ticks -->
        <line
          stroke="white"
          x1={xScale(tick)}
          x2={xScale(tick)}
          y1={0}
          y2={6}
        />
  
        <!-- X-Axis Tick Labels -->
        <text fill="white" text-anchor="middle" x={xScale(tick)} y={22}>
          {tick}
        </text>
      {/each}
    </g>
  
    <!-- Y-Axis and Grid Lines -->
    <g transform="translate({marginLeft},0)">
      {#each yScale.ticks() as tick}
        {#if tick !== 0}
          <!-- 
            Grid Lines. 
            Note: First line is skipped since the x-axis is already present at 0. 
          -->
          <line
            stroke="white"
            stroke-opacity="0.1"
            x1={0}
            x2={width - marginLeft}
            y1={yScale(tick)}
            y2={yScale(tick)}
          />
  
          <!-- 
            Y-Axis Ticks. 
            Note: First tick is skipped since the x-axis already acts as a tick. 
          -->
          <line
            stroke="white"
            x1={0}
            x2={-6}
            y1={yScale(tick)}
            y2={yScale(tick)}
          />
        {/if}
  
        <!-- Y-Axis Tick Labels -->
        <text
          fill="white"
          text-anchor="end"
          dominant-baseline="middle"
          x={-9}
          y={yScale(tick)}
        >
          {tick}
        </text>
      {/each}
  
      <!-- Y-Axis Label -->
      <text fill="white" text-anchor="start" x={-marginLeft+6} y={20}>
        {title || "Market"} ($)
      </text>
    </g>
    
    {#if data.length > 0}
      <path fill="none" stroke="orange" stroke-width="5" d={line(data)} />
    {/if}
  </svg>