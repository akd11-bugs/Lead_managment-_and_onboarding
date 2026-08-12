// Claymorphism bar shape for Recharts <Bar shape={...}> — soft 3D puffy bars:
// a light-to-base gradient fill, a colored soft drop shadow, and a top sheen highlight.
// Each chart instance passes its own uid (from useId()) so multiple charts on one
// page never collide on SVG def ids.

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * amt))
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function roundedTopRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, height, width / 2))
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
}

interface ClayBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  index?: number
}

export function claymorphicBar(chartUid: string) {
  function ClayBarShape(props: ClayBarProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill = '#888', index = 0 } = props
    if (width <= 0 || height <= 0) return null

    const id = `${chartUid}-${index}`
    const radius = Math.min(width / 2, 10)

    return (
      <g>
        <defs>
          <linearGradient id={`clay-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lighten(fill, 0.5)} />
            <stop offset="100%" stopColor={fill} />
          </linearGradient>
          <filter id={`clay-shadow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor={fill} floodOpacity="0.35" />
          </filter>
        </defs>
        <path
          d={roundedTopRectPath(x, y, width, height, radius)}
          fill={`url(#clay-grad-${id})`}
          filter={`url(#clay-shadow-${id})`}
        />
        <rect
          x={x + width * 0.2}
          y={y + Math.min(height * 0.1, 6)}
          width={width * 0.6}
          height={Math.max(height * 0.1, 3)}
          rx={Math.max(width * 0.25, 3)}
          fill="rgba(255,255,255,0.55)"
        />
      </g>
    )
  }
  return ClayBarShape
}
