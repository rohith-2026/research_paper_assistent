import { motion } from "framer-motion";

type Prediction = { label: string; score: number };

function pct(v: number) {
  const n = Math.max(0, Math.min(1, v));
  return Math.round(n * 1000) / 10; // one decimal
}

export default function PredictionsBar({
  predictions,
  activeLabel,
}: {
  predictions: Prediction[];
  activeLabel?: string;
}) {
  const top = predictions?.slice(0, 5) ?? [];

  return (
    <div className="glass rounded-[28px] p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-black tracking-tight">Top Predictions</div>
          <p className="text-sm text-white/65 mt-1">
            Model confidence distribution (Top {top.length})
          </p>
        </div>

        {activeLabel ? (
          <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
            Selected: <b className="text-white/85">{activeLabel}</b>
          </span>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {top.map((p, idx) => {
          const isActive = activeLabel && p.label === activeLabel;
          return (
            <div key={p.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isActive
                        ? "bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.55)]"
                        : "bg-white/25"
                    }`}
                  />
                  <div className="font-semibold text-white/90 truncate">
                    {idx + 1}. {p.label}
                  </div>
                </div>

                <div className="text-sm text-white/70 font-semibold">
                  {pct(p.score)}%
                </div>
              </div>

              <div className="h-2.5 w-full bg-white/10 rounded-full border border-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, Math.min(100, p.score * 100))}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      isActive
                        ? "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(40,98,58,0.35))"
                        : "linear-gradient(90deg, rgba(40,98,58,0.9), rgba(40,98,58,0.25))",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
