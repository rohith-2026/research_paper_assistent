import { useEffect, useMemo, useState } from "react";
import { apiAdminApiUsage } from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import { startOfIstDay, toIstDateKey } from "../../utils/time";
import toast from "react-hot-toast";

type EndpointRow = {
  endpoint: string;
  count: number;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toDateKey = (d: Date) => toIstDateKey(d);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const startOfDay = (d: Date) => startOfIstDay(d);

const buildCalendarHeatmap = (daily: { date: string; count: number }[], rangeDays: number) => {
  const map: Record<string, number> = {};
  daily.forEach((d) => {
    map[d.date] = d.count;
  });
  const end = startOfDay(new Date());
  const start = addDays(end, -(rangeDays - 1));
  const startWeekday = (start.getDay() + 6) % 7;
  const totalCells = startWeekday + rangeDays;
  const weeks = Math.ceil(totalCells / 7);
  const grid: { date: string | null; count: number }[][] = Array.from({ length: 7 }).map(() =>
    Array.from({ length: weeks }).map(() => ({ date: null, count: 0 }))
  );

  for (let i = 0; i < rangeDays; i += 1) {
    const date = addDays(start, i);
    const idx = startWeekday + i;
    const row = idx % 7;
    const col = Math.floor(idx / 7);
    const key = toDateKey(date);
    grid[row][col] = { date: key, count: map[key] || 0 };
  }
  const max = Math.max(1, ...daily.map((d) => d.count));
  return { grid, max };
};

export default function AdminApiUsage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const rangeDays = range === "7d" ? 7 : range === "14d" ? 14 : 30;
        const res = await apiAdminApiUsage(rangeDays);
        setData(res || null);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load API usage"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);

  const endpoints: EndpointRow[] = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.endpoints || data?.items || [];
    return (list || []).map((r: any) => ({
      endpoint: r.endpoint || r.path || "unknown",
      count: Number(r.count || r.requests || 0),
    }));
  }, [data]);

  const totalRequests = endpoints.reduce((acc, r) => acc + r.count, 0);
  const rangeLabel = range === "7d" ? "Last 7 days" : range === "14d" ? "Last 14 days" : "Last 30 days";

  const daily: { date: string; count: number }[] = data?.daily || [];
  const { grid: heatmapGrid, max: heatMax } = useMemo(() => {
    const rangeDays = range === "7d" ? 7 : range === "14d" ? 14 : 30;
    return buildCalendarHeatmap(daily, rangeDays);
  }, [daily, range]);

  const topUsers = useMemo(() => {
    const rows = data?.top_users || [];
    return rows.map((u: any) => ({
      name: u.name || u.email || u.user_id || "Unknown",
      requests: u.count || 0,
      risk: (u.count || 0) > 1000 ? "High" : (u.count || 0) > 300 ? "Medium" : "Low",
    }));
  }, [data]);

  const statusBreakdown = data?.status_breakdown || null;
  const modelUsage = data?.model_usage || [];
  const geo = data?.geo || [];
  const abuseSignals = data?.abuse_signals || [];
  const latencyAvgMs = data?.latency_avg_ms;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading API usage..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
          <h1 className="text-3xl font-black text-white/95">API Usage</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {["7d", "14d", "30d"].map((r) => (
            <button
              key={r}
              className={`px-3 py-2 rounded-full text-xs border ${
                range === r ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/60"
              }`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              const payload = {
                range,
                totalRequests,
                endpoints,
                daily,
                topUsers,
                statusBreakdown,
                modelUsage,
                geo,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "api_usage.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export JSON
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              const rows = endpoints.map((e) => ({
                endpoint: e.endpoint,
                count: e.count,
              }));
              const header = Object.keys(rows[0] || {}).join(",");
              const body = rows.map((r) => Object.values(r).join(",")).join("\n");
              const csv = `${header}\n${body}`;
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "api_usage.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("CSV exported");
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">{rangeLabel}</div>
            <div className="text-2xl font-semibold text-white/90">{totalRequests.toLocaleString()}</div>
            <div className="text-xs text-white/40">Total requests</div>
          </div>
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">Error rate</div>
            <div className="text-2xl font-semibold text-white/90">
              {statusBreakdown
                ? `${Math.round(((statusBreakdown["4xx"] + statusBreakdown["5xx"]) / Math.max(totalRequests, 1)) * 100)}%`
                : "N/A"}
            </div>
            <div className="text-xs text-white/40">4xx + 5xx</div>
          </div>
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">Latency p50</div>
            <div className="text-2xl font-semibold text-white/90">
              {latencyAvgMs ? `${latencyAvgMs}ms` : "N/A"}
            </div>
            <div className="text-xs text-white/40">Avg response</div>
          </div>
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">Latency p95</div>
            <div className="text-2xl font-semibold text-white/80">N/A</div>
            <div className="text-xs text-white/40">Backend not provided</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="text-sm font-semibold text-white/80">Endpoint heatmap</div>
          <div className="mt-3 grid grid-cols-[60px_repeat(6,1fr)] gap-1 text-[10px] text-white/40">
            <div />
            {Array.from({ length: heatmapGrid[0]?.length || 0 }).map((_, h) => (
              <div key={h} className="text-center">W{h + 1}</div>
            ))}
            {heatmapGrid.map((row, i) => (
              <div key={i} className="contents">
                <div className="text-xs text-white/40 pr-2">{dayNames[i]}</div>
                {row.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                    className="h-3 rounded-sm"
                    style={{
                      backgroundColor: cell.date
                        ? `rgba(16,185,129,${clamp(cell.count / heatMax, 0.08, 0.9)})`
                        : "transparent",
                    }}
                    title={cell.date ? `${cell.date} · ${cell.count} requests` : ""}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white/80">Failure analysis</div>
          <div className="mt-4 space-y-3">
            {!statusBreakdown && (
              <div className="text-xs text-white/50">No status code data from backend.</div>
            )}
            {statusBreakdown &&
              Object.entries(statusBreakdown).map(([k, v]) => (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{k}</span>
                    <span>{Number(v).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-2 ${k === "5xx" ? "bg-rose-400/70" : k === "4xx" ? "bg-amber-400/70" : "bg-emerald-400/70"}`}
                      style={{ width: `${(Number(v) / Math.max(totalRequests, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white/80">Top endpoints</div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-[960px] w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "520px" }} />
              <col style={{ width: "160px" }} />
            </colgroup>
            <thead>
              <tr className="text-xs text-white/50">
                <th className="px-3 py-2 text-left">Endpoint</th>
                <th className="px-3 py-2 text-left">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {endpoints.slice(0, 10).map((e) => (
                <tr key={e.endpoint} className="text-sm text-white/70">
                  <td className="px-3 py-3 font-mono">{e.endpoint}</td>
                  <td className="px-3 py-3">{e.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-sm font-semibold text-white/80">Latency percentiles</div>
          <div className="mt-3 space-y-3">
            <div className="text-xs text-white/50">No latency data from backend.</div>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Token usage by model</div>
          <div className="mt-3 space-y-3">
            {modelUsage.length === 0 && <div className="text-xs text-white/50">No model usage data.</div>}
            {modelUsage.map((m: any) => (
              <div key={m.model}>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{m.model}</span>
                  <span>{Number(m.tokens).toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 bg-emerald-400/70"
                    style={{ width: `${(Number(m.tokens) / Math.max(Number(modelUsage[0]?.tokens || 1), 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Abuse radar</div>
          <div className="mt-3 space-y-3">
            {abuseSignals.length === 0 && (
              <div className="text-xs text-white/50">No abuse signals from backend.</div>
            )}
            {abuseSignals.map((s: any) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-white/60">{s.label}</span>
                <span className={s.color || "text-white/80"}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="text-sm font-semibold text-white/80">Per-user usage</div>
          <div className="mt-3 space-y-3">
            {topUsers.length === 0 && <div className="text-xs text-white/50">No user usage data.</div>}
            {topUsers.map((u) => (
              <div key={u.name} className="flex items-center justify-between text-xs">
                <div>
                  <div className="text-white/80">{u.name}</div>
                  <div className="text-[10px] text-white/40">{u.requests} requests</div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-[10px] ${
                    u.risk === "High"
                      ? "bg-rose-500/10 text-rose-200"
                      : u.risk === "Medium"
                      ? "bg-amber-500/10 text-amber-200"
                      : "bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  {u.risk}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Geo/IP distribution</div>
          <div className="mt-3 space-y-3">
            {geo.length === 0 && <div className="text-xs text-white/50">No geo data from backend.</div>}
            {geo.map((g: any) => (
              <div key={g.region}>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{g.region}</span>
                  <span>{Number(g.share)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-2 bg-emerald-400/70" style={{ width: `${Number(g.share)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
