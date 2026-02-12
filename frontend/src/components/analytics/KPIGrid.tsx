import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export type KPIItem = {
  label: string;
  value: string;
  delta: string;
  accent?: "emerald" | "cyan" | "violet";
};

const defaultKpis: KPIItem[] = [
  { label: "Total Queries", value: "1,284", delta: "+12.4%", accent: "emerald" },
  { label: "Papers Saved", value: "412", delta: "+8.9%", accent: "cyan" },
  { label: "Summaries", value: "196", delta: "+15.2%", accent: "violet" },
  { label: "Active Sessions", value: "24", delta: "+3.1%", accent: "emerald" },
];

const accentClass: Record<string, string> = {
  emerald: "from-emerald-400/20 to-emerald-300/5 text-emerald-200",
  cyan: "from-cyan-400/20 to-cyan-300/5 text-cyan-200",
  violet: "from-violet-400/20 to-violet-300/5 text-violet-200",
};

export default function KPIGrid({ items }: { items?: KPIItem[] }) {
  const kpis = items && items.length ? items : defaultKpis;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, idx) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.05 }}
          className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 hover:shadow-glow"
        >
          <div
            className={cn(
              "text-[11px] uppercase tracking-[0.2em] text-white/50",
              "mb-4"
            )}
          >
            {kpi.label}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-black">{kpi.value}</div>
            <div
              className={cn(
                "px-3 py-1 rounded-full text-xs border border-white/10",
                "bg-gradient-to-br",
                accentClass[kpi.accent || "emerald"]
              )}
            >
              {kpi.delta}
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                kpi.accent === "cyan"
                  ? "from-cyan-400 to-cyan-300"
                  : kpi.accent === "violet"
                  ? "from-violet-400 to-violet-300"
                  : "from-emerald-400 to-emerald-300"
              )}
              style={{ width: `${60 + idx * 9}%` }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
