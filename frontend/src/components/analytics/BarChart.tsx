import { motion } from "framer-motion";

type BarChartProps = {
  title: string;
  data: { label: string; value: number }[];
  markers?: { index: number; label: string; color?: string }[];
};

export default function BarChart({ title, data, markers = [] }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 grid grid-cols-6 gap-3 items-end h-40">
        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          const marker = markers.find((m) => m.index === i);
          return (
            <div key={d.label} className="flex flex-col items-center gap-2">
              <div className="relative flex flex-col items-center">
                <motion.div
                  initial={{ height: 0, opacity: 0.6 }}
                  animate={{ height: `${h}%`, opacity: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  className={`w-6 rounded-full shadow-glow ${
                    marker
                      ? "bg-gradient-to-b from-amber-400 to-rose-400"
                      : "bg-gradient-to-b from-cyan-400 to-emerald-400"
                  }`}
                  style={{ minHeight: 8 }}
                  title={marker?.label}
                />
                {marker && (
                  <span
                    className="absolute -top-2 h-2 w-2 rounded-full border border-white/60"
                    style={{ background: marker.color || "#F59E0B" }}
                    title={marker.label}
                  />
                )}
              </div>
              <div className="text-[10px] text-white/50">{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
