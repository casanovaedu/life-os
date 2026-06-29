type Props = {
  value: number
  max?: number
  color: string
  trackColor?: string
  label: string
  unit?: string
  size?: number
  strokeWidth?: number
}

export function RingMetric({
  value,
  max = 100,
  color,
  trackColor = 'rgba(255,255,255,0.07)',
  label,
  unit = '%',
  size = 96,
  strokeWidth = 9,
}: Props) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const fill = pct * circ

  const display = unit === '%' ? `${Math.round(value)}%` : `${value}`

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden
        >
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {value > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${fill} ${circ}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white leading-none">{display}</span>
          {unit !== '%' && <span className="text-[9px] text-white/40 mt-0.5">{unit}</span>}
        </div>
      </div>
      <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">{label}</span>
    </div>
  )
}
