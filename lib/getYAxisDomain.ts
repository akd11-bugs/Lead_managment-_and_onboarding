// Tremor getYAxisDomain [v0.0.0]
// Vendored for components/charts/BarChart.tsx (Tremor's Bar Chart component).

export const getYAxisDomain = (autoMinValue: boolean, minValue: number | undefined, maxValue: number | undefined) => {
  const minDomain = autoMinValue ? 'auto' : minValue ?? 0
  const maxDomain = maxValue ?? 'auto'
  return [minDomain, maxDomain]
}
