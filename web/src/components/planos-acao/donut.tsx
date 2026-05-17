"use client";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  onSliceClick?: (label: string) => void;
}

export function Donut({ slices, size = 140, thickness = 22, centerLabel, centerValue, onSliceClick }: DonutProps) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ width: size, height: size }}
      >
        sem dados
      </div>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          {slices.map((sl, i) => {
            const fraction = sl.value / total;
            const dash = fraction * circumference;
            const offset = cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={i}
                r={radius}
                cx={0}
                cy={0}
                fill="transparent"
                stroke={sl.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90)"
                style={{ cursor: onSliceClick ? "pointer" : "default", transition: "opacity 0.2s" }}
                onClick={() => onSliceClick?.(sl.label)}
              >
                <title>{`${sl.label}: ${sl.value} (${((fraction * 100).toFixed(1))}%)`}</title>
              </circle>
            );
          })}
          {centerValue !== undefined && (
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size / 6}
              fontWeight="800"
              fill="#0A2540"
            >
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={size / 7}
              fontSize={size / 14}
              fill="#6B7280"
            >
              {centerLabel}
            </text>
          )}
        </g>
      </svg>
      <ul className="text-xs space-y-1">
        {slices.map((sl, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 ${onSliceClick ? "cursor-pointer hover:text-brand-navy" : ""}`}
            onClick={() => onSliceClick?.(sl.label)}
          >
            <span className="inline-block w-3 h-3 rounded" style={{ background: sl.color }} />
            <span className="font-medium">{sl.label}</span>
            <span className="text-muted-foreground">({sl.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
