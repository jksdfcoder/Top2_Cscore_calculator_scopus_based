<script setup lang="ts">
import type { CalculationResult, Metrics } from '~/lib/cscore'
import { metricNames } from '~/lib/cscore'
const props = defineProps<{ result: CalculationResult; peer?: Metrics }>()
const element = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | undefined
let observer: ResizeObserver | undefined
let disposed = false
function update() {
  const series = [
    {
      value: metricNames.map((key) => props.result.contributions[key]),
      name: 'Calculated estimate',
      lineStyle: { color: '#ad8533', width: 2 },
      itemStyle: { color: '#ad8533' },
      areaStyle: { color: '#ad8533', opacity: 0.16 },
    },
  ]
  if (props.peer)
    series.push({
      value: metricNames.map((key) => props.peer![key]),
      name: 'V9 listed author',
      lineStyle: { color: '#1f4d3c', width: 2, type: 'dashed' } as never,
      itemStyle: { color: '#1f4d3c' },
      areaStyle: { color: '#1f4d3c', opacity: 0 },
    })
  const max = Math.max(...series.flatMap((s) => s.value))
  chart?.setOption(
    {
      animation: false,
      aria: { enabled: true },
      tooltip: { show: false },
      radar: {
        radius: '64%',
        center: ['50%', '50%'],
        indicator: metricNames.map((name) => ({
          name: `${name} (${props.result.metrics[name].toLocaleString('en', { maximumFractionDigits: 2 })})`,
          max,
        })),
        axisName: { color: '#5a625d', fontSize: 12 },
        splitArea: { show: false },
        splitLine: { lineStyle: { color: '#dcdcd6' } },
        axisLine: { lineStyle: { color: '#dcdcd6' } },
      },
      series: [{ type: 'radar', symbol: 'circle', symbolSize: 5, data: series }],
    },
    { replaceMerge: ['series'] },
  )
}
onMounted(async () => {
  const [{ init, use }, { RadarChart }, { RadarComponent, AriaComponent }, { SVGRenderer }] =
    await Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ])
  if (disposed || !element.value) return
  use([RadarChart, RadarComponent, AriaComponent, SVGRenderer])
  chart = init(element.value, undefined, { renderer: 'svg' })
  update()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(element.value)
})
watch(() => [props.result, props.peer], update)
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  chart?.dispose()
})
</script>
<template>
  <figure class="contribution-chart">
    <div
      ref="element"
      class="chart-canvas"
      role="img"
      aria-label="Radar chart of six score contributions. Exact values follow in a table."
    />
  </figure>
</template>
