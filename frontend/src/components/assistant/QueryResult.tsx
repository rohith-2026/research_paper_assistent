import { motion } from "framer-motion";
import { ExternalLink, Copy, CheckCircle2, Sparkles, LayoutGrid, List } from "lucide-react";
import { useMemo, useState } from "react";
import type { PaperItem, QueryResponse } from "../../api/assistant.api";
import { apiSavePaper } from "../../api/assistant.api";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../utils/errors";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function percent(n: number) {
  return `${(clamp01(n) * 100).toFixed(2)}%`;
}

function safeUrl(url?: string | null) {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  // allow doi url or http
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("doi.org/")) return `https://${u}`;
  if (u.startsWith("10.")) return `https://doi.org/${u}`;
  return u;
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent";
}) {
  const cls =
    tone === "accent"
      ? "bg-emerald-300/10 border-emerald-200/20 text-emerald-100"
      : "bg-white/5 border-white/10 text-white/70";

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs ${cls}`}
    >
      {children}
    </span>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  const p = clamp01(value);
  const size = 92;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * p;

  return (
    <div className="relative">
      <svg width={size} height={size} className="block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(52,211,153,0.95)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: "drop-shadow(0 0 12px rgba(52,211,153,0.35))",
          }}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-tight">
          <div className="text-xs text-white/60">Confidence</div>
          <div className="text-lg font-black">{(p * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}

function PaperCard({ p, idx }: { p: PaperItem & { subject_area?: string }; idx: number }) {
  const [copied, setCopied] = useState(false);
  const url = safeUrl(p.url);

  const onSave = async () => {
    try {
      await apiSavePaper(p);
      toast.success("Paper saved");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to save paper"));
    }
  };

  const onCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.03 }}
      className="glass-soft rounded-[26px] p-5 border border-white/10 hover:border-white/20 hover:shadow-glow hover-lift"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-white/55 font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70">
              {idx + 1}
            </span>
            <span>Paper</span>
          </div>
          <div className="mt-2 text-base md:text-lg font-extrabold text-white leading-snug line-clamp-3">
            {p.title || "Untitled"}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {p.year ? <Chip>{p.year}</Chip> : null}
            {p.venue ? <Chip>{p.venue}</Chip> : null}
            {p.source ? <Chip tone="accent">{p.source}</Chip> : null}
            {p.subject_area ? <Chip>{p.subject_area}</Chip> : null}
          </div>

          {p.authors?.length ? (
            <div className="mt-3 text-sm text-white/65 line-clamp-2">
              <span className="text-white/70 font-semibold">Authors:</span>{" "}
              {p.authors.slice(0, 4).join(", ")}
              {p.authors.length > 4 ? " ..." : ""}
            </div>
          ) : null}
        </div>

        {/* actions */}
        <div className="flex flex-col gap-2 shrink-0 min-w-[120px]">
          <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            className={`btn-primary px-3 py-2 rounded-xl text-sm text-center ${
              !url ? "pointer-events-none opacity-50" : ""
            }`}
            title="Open paper"
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <ExternalLink className="h-4 w-4" />
              Open
            </span>
          </a>

          <button
            onClick={onCopy}
            disabled={!url}
            className={`btn-secondary px-3 py-2 rounded-xl text-sm ${
              !url ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Copy link"
            type="button"
          >
            {copied ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Copied
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copy link
              </span>
            )}
          </button>

          <button
            onClick={onSave}
            className="btn-secondary px-3 py-2 rounded-xl text-sm"
            title="Save paper"
            type="button"
          >
            Save
          </button>
        </div>
      </div>

      {/* url */}
      {url ? (
        <div className="mt-4 text-xs text-emerald-200/90 break-all">
          {url}
        </div>
      ) : (
        <div className="mt-4 text-xs text-white/50 italic">
          No direct URL available.
        </div>
      )}
    </motion.div>
  );
}

export default function QueryResult({
  data,
  viewMode,
  onViewModeChange,
}: {
  data: QueryResponse;
  viewMode?: "grid" | "list";
  onViewModeChange?: (next: "grid" | "list") => void;
}) {
  const best = clamp01(data.model_confidence || 0);
  const [localView, setLocalView] = useState<"grid" | "list">("grid");
  const view = viewMode ?? localView;
  const setView = (next: "grid" | "list") => {
    if (onViewModeChange) {
      onViewModeChange(next);
    } else {
      setLocalView(next);
    }
  };

  const sortedPreds = useMemo(() => {
    const arr = [...(data.top_predictions || [])];
    arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return arr.slice(0, 5);
  }, [data.top_predictions]);

  return (
    <div className="mt-6 space-y-6">
      {/* ================= PREDICTION PANEL ================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="glass rounded-[32px] border border-white/10 overflow-hidden"
      >
        <div className="p-6 md:p-7 relative overflow-hidden">
          {/* glow */}
          <div className="pointer-events-none absolute -top-20 -right-24 h-72 w-72 rounded-full bg-[#28623a]/25 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                <Sparkles className="h-4 w-4 text-emerald-200" />
                ML Prediction Result
              </div>

              <h3 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">
                Subject Area:{" "}
                <span className="text-emerald-200">{data.subject_area}</span>
              </h3>

              <p className="mt-2 text-white/70">
                Your model predicted this subject with high confidence and top-k
                alternatives.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Chip tone="accent">Top Prediction</Chip>
                <Chip>{percent(best)}</Chip>
                <Chip>Top-K: {sortedPreds.length}</Chip>
              </div>
            </div>

            {/* right */}
            <ConfidenceRing value={best} />
          </div>

          {/* predictions bars */}
          <div className="mt-7 space-y-3">
            {sortedPreds.map((p) => {
              const val = clamp01(p.score ?? 0);
              return (
                <div
                  key={p.label}
                  className="glass-soft rounded-2xl border border-white/10 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-white/90">{p.label}</div>
                    <div className="text-sm text-white/70">{percent(val)}</div>
                  </div>

                  <div className="mt-2 h-2.5 w-full rounded-full bg-white/5 overflow-hidden border border-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${val * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-emerald-300/70"
                      style={{
                        boxShadow: "0 0 18px rgba(52,211,153,0.35)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ================= PAPERS PANEL ================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
        className="glass rounded-[32px] border border-white/10"
      >
        <div className="p-6 md:p-7">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-2xl font-black tracking-tight">
                Top 10 Research Papers
              </h3>
              <p className="mt-2 text-white/70">
                Direct links fetched from multi-source providers (free APIs).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="glass-soft px-4 py-2 rounded-2xl border border-white/10 text-sm text-white/70">
                Results: <b className="text-white">{data.top_papers?.length || 0}</b>
              </div>
              <div className="glass-soft p-1 rounded-2xl border border-white/10 flex items-center gap-1">
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-2 rounded-xl text-xs inline-flex items-center gap-2 ${
                    view === "list" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                  }`}
                  type="button"
                >
                  <List className="h-4 w-4" />
                  List
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`px-3 py-2 rounded-xl text-xs inline-flex items-center gap-2 ${
                    view === "grid" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                  }`}
                  type="button"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Split
                </button>
              </div>
            </div>
          </div>

          <div
            className={`mt-6 grid gap-4 ${view === "grid" ? "md:grid-cols-2" : "grid-cols-1"}`}
          >
            {data.top_papers?.length ? (
              data.top_papers.map((p, idx) => {
                const withSubject: PaperItem & { subject_area?: string } = {
                  ...p,
                  subject_area: data.subject_area,
                };
                return (
                  <PaperCard p={withSubject} idx={idx} key={`${p.title}-${idx}`} />
                );
              })
            ) : (
              <div className="text-white/70">No papers found.</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
