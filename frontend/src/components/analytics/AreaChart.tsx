import { motion } from "framer-motion";
import { useMemo, useState } from "react";

type AreaChartProps = {
  title: string;
  data: number[];
  markers?: { index: number; label: string; color?: string }[];
  labels?: string[];
  focusIndex?: number | null;
  onSelectIndex?: (index: number) => void;
};

function buildArea(data: number[], w: number, h: number) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const line = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return `${line} L ${w} ${h} L 0 ${h} Z`;
}

function buildPoints(data: number[], w: number, h: number) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  return data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return { x, y };
  });
}

export default function AreaChart({
  title,
  data,
  markers = [],
  labels = [],
  focusIndex = null,
  onSelectIndex,
}: AreaChartProps) {
  const w = 520;
  const h = 160;
  const area = buildArea(data, w, h);
  const points = buildPoints(data, w, h);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeIndex = hoverIndex ?? focusIndex;
  const activePoint = activeIndex != null ? points[activeIndex] : null;
  const activeLabel = activeIndex != null ? labels[activeIndex] : undefined;

  const valueRange = useMemo(() => {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    return { min, max };
  }, [data]);

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-[11px] text-white/60">
        {activeIndex != null ? (
          <>
            <span className="text-white/80">{activeLabel || `Point ${activeIndex + 1}`}</span>
            <span className="ml-2 text-white/50">
              {data[activeIndex]?.toFixed(2)} (min {valueRange.min.toFixed(2)} / max{" "}
              {valueRange.max.toFixed(2)})
            </span>
          </>
        ) : (
          <span>Hover for exact values.</span>
        )}
      </div>
      <div className="mt-4">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-40"
          role="img"
          aria-label={title}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.max(0, Math.min(data.length - 1, Math.round((x / rect.width) * (data.length - 1))));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
          onClick={() => {
            if (activeIndex != null) onSelectIndex?.(activeIndex);
          }}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(139,92,246,0.55)" />
              <stop offset="100%" stopColor="rgba(139,92,246,0.08)" />
            </linearGradient>
          </defs>
          <motion.path
            d={area}
            fill="url(#areaFill)"
            stroke="rgba(139,92,246,0.9)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.35))" }}
          />
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={0}
                y2={h}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={4}
                fill="#A78BFA"
                stroke="rgba(15,23,42,0.9)"
                strokeWidth="1"
              />
            </>
          )}
          {markers.map((m) => {
            const p = points[m.index];
            if (!p) return null;
            return (
              <g key={`${m.index}-${m.label}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4.5}
                  fill={m.color || "#F472B6"}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth="1"
                  onClick={() => onSelectIndex?.(m.index)}
                >
                  <title>{m.label}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
