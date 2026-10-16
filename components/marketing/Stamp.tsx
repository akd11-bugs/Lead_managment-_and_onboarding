// Stamp primitives drawn from the house asset sheet: perforated edges, ink
// red and navy on cream, slightly off-register so they read as pressed
// rather than printed.
//
// These are inline SVG rather than image files on purpose. They recolor from
// CSS, stay sharp at any size, cost no extra requests, and the perforation
// geometry is generated instead of baked into a bitmap.

export const INK_RED = '#C8402F'
export const INK_NAVY = '#1B3A6B'
export const PAPER = '#F4EDE2'

/** Perforated stamp border as a single path, generated from the tooth count. */
function perforationPath(w: number, h: number, r: number, step: number) {
  const holes: string[] = []
  for (let x = step / 2; x < w; x += step) {
    holes.push(`M ${x - r},0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`)
    holes.push(`M ${x - r},${h} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`)
  }
  for (let y = step / 2; y < h; y += step) {
    holes.push(`M 0,${y - r} a ${r},${r} 0 1,0 0,${r * 2} a ${r},${r} 0 1,0 0,${-r * 2}`)
    holes.push(`M ${w},${y - r} a ${r},${r} 0 1,0 0,${r * 2} a ${r},${r} 0 1,0 0,${-r * 2}`)
  }
  return holes.join(' ')
}

/**
 * A single stamp tile. `tone` picks the ink; `filled` inverts it so the mark
 * sits knocked out of a solid ink field, as on the sheet's first two tiles.
 */
export function Stamp({
  children,
  tone = 'red',
  filled = false,
  size = 92,
  className = '',
  label,
}: {
  children: React.ReactNode
  tone?: 'red' | 'navy'
  filled?: boolean
  size?: number
  className?: string
  label?: string
}) {
  const ink = tone === 'red' ? INK_RED : INK_NAVY
  const w = size
  const h = size
  const id = `perf-${tone}-${filled ? 'f' : 'o'}-${size}`

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <mask id={id}>
          <rect width={w} height={h} fill="#fff" />
          <path d={perforationPath(w, h, 2.6, 9)} fill="#000" />
        </mask>
      </defs>

      {/* Paper body, punched by the perforation mask. */}
      <rect width={w} height={h} fill={filled ? ink : PAPER} mask={`url(#${id})`} />
      {/* Inner keyline, the way the sheet frames each tile. */}
      <rect
        x={7}
        y={7}
        width={w - 14}
        height={h - 14}
        fill="none"
        stroke={filled ? PAPER : ink}
        strokeWidth={1.4}
        opacity={0.9}
      />
      <g
        transform={`translate(${w / 2}, ${h / 2})`}
        stroke={filled ? PAPER : ink}
        fill="none"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  )
}

/* ---- Glyphs, drawn centred on (0,0) so Stamp can place them ---- */

export const GlyphDocument = (
  <>
    <path d="M -11,-15 L 5,-15 L 13,-7 L 13,15 L -11,15 Z" />
    <path d="M 5,-15 L 5,-7 L 13,-7" />
    <path d="M -6,-1 H 8 M -6,5 H 8 M -6,11 H 3" />
  </>
)

export const GlyphShield = (
  <>
    <path d="M 0,-15 L 13,-10 V 2 C 13,11 6,16 0,18 C -6,16 -13,11 -13,2 V -10 Z" />
    <rect x={-5} y={-3} width={10} height={9} rx={1.6} />
    <path d="M -2.5,-3 V -6 a 2.5,2.5 0 0 1 5,0 V -3" />
  </>
)

export const GlyphGraph = (
  <>
    <circle cx={0} cy={-11} r={4.2} />
    <circle cx={-11} cy={9} r={4.2} />
    <circle cx={11} cy={9} r={4.2} />
    <path d="M -2.6,-7.6 L -8.6,5.4 M 2.6,-7.6 L 8.6,5.4 M -6.8,9 H 6.8" />
  </>
)

export const GlyphSync = (
  <>
    <path d="M -13,-3 A 13,13 0 0 1 9,-11" />
    <path d="M 9,-16 L 11,-10 L 5,-9" fill="none" />
    <path d="M 13,3 A 13,13 0 0 1 -9,11" />
    <path d="M -9,16 L -11,10 L -5,9" fill="none" />
  </>
)

export const GlyphBank = (
  <>
    <path d="M -14,-4 L 0,-14 L 14,-4 Z" />
    <path d="M -10,-1 V 10 M -3.5,-1 V 10 M 3.5,-1 V 10 M 10,-1 V 10" />
    <path d="M -14,14 H 14" />
  </>
)

export const GlyphGlobe = (
  <>
    <circle cx={0} cy={0} r={14} />
    <ellipse cx={0} cy={0} rx={6} ry={14} />
    <path d="M -14,-5 H 14 M -14,5 H 14" />
  </>
)

export const GlyphReceipt = (
  <>
    <path d="M -11,-15 H 11 V 15 L 7,12 L 3,15 L -1,12 L -5,15 L -9,12 L -11,15 Z" />
    <path d="M -6,-8 H 6 M -6,-2 H 6 M -6,4 H 2" />
  </>
)

export const GlyphCheck = (
  <>
    <circle cx={0} cy={0} r={14} />
    <path d="M -7,0 L -2,6 L 8,-6" />
  </>
)

/** The house "S" mark, as it appears in the sheet's first three lockups. */
export const GlyphS = (
  <path
    d="M 12,-11 C 4,-17 -12,-14 -12,-5 C -12,3 2,2 2,2 C 2,2 14,2 12,8 C 10,15 -4,16 -12,10"
    strokeWidth={4.6}
  />
)
