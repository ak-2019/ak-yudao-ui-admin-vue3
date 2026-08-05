import * as echarts from 'echarts/core'

import {
  BarChart,
  CandlestickChart,
  FunnelChart,
  GaugeChart,
  LineChart,
  MapChart,
  PictorialBarChart,
  PieChart,
  RadarChart,
  ScatterChart
} from 'echarts/charts'

import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ParallelComponent,
  PolarComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent
} from 'echarts/components'

import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  ToolboxComponent,
  DataZoomComponent,
  GridComponent,
  PolarComponent,
  AriaComponent,
  ParallelComponent,
  VisualMapComponent,
  BarChart,
  CandlestickChart,
  LineChart,
  PieChart,
  MapChart,
  CanvasRenderer,
  PictorialBarChart,
  RadarChart,
  ScatterChart,
  GaugeChart,
  FunnelChart
])

export default echarts
