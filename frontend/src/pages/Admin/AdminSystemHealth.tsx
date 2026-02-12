import { useEffect, useMemo, useState } from "react";
import { apiAdminSystemHealth } from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";

const cx = (parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export default function AdminSystemHealth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiAdminSystemHealth();
        setData(res);
        setLastChecked(Date.now());
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load system health"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(async () => {
      try {
        const res = await apiAdminSystemHealth();
        setData(res);
        setLastChecked(Date.now());
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load system health"));
      }
    }, 10000);
    return () => clearInterval(id);
  }, [live]);

  const status = data?.db_ok ? "Healthy" : "Degraded";
  const statusTone = data?.db_ok ? "text-emerald-200" : "text-rose-200";
  const statusBadge = data?.db_ok
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : "border-rose-400/30 bg-rose-500/10 text-rose-200";
  const services = Array.isArray(data?.services) ? data.services : [];
  const resources = data?.resources || {};
  const latency = data?.latency || {};
  const connections = data?.db_connections || {};
  const workers = Array.isArray(data?.workers) ? data.workers : [];
  const dependencies = Array.isArray(data?.dependencies) ? data.dependencies : [];
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
  const history = Array.isArray(data?.history) ? data.history : [];

  const serverTime = data?.server_time ? new Date(data.server_time) : null;
  const lastCheckedStr = lastChecked ? new Date(lastChecked).toLocaleTimeString() : "-";
  const timeSkewMs = useMemo(() => {
    if (!serverTime || !lastChecked) return null;
    return Math.abs(serverTime.getTime() - lastChecked);
  }, [serverTime, lastChecked]);
  const timeSkewStr = timeSkewMs != null ? `${Math.round(timeSkewMs / 1000)}s` : "-";

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading system health..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Ops</div>
          <h1 className="text-2xl font-semibold text-white/90">System Health</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cx(["px-3 py-1.5 rounded-full text-xs border", statusBadge])}>
            {status}
          </span>
          <button
            className={cx([
              "px-3 py-2 rounded-full text-xs border",
              live ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/60",
            ])}
            onClick={() => setLive((v) => !v)}
          >
            Live
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={async () => {
              const res = await apiAdminSystemHealth();
              setData(res);
              setLastChecked(Date.now());
              toast.success("Refreshed");
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs text-white/50">Database</div>
          <div className={`text-2xl font-semibold ${statusTone}`}>{status}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Server time</div>
          <div className="text-2xl font-semibold">
            {data?.server_time ? new Date(data.server_time).toLocaleString() : "-"}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Last checked</div>
          <div className="text-2xl font-semibold">{lastCheckedStr}</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs text-white/50">Uptime</div>
          <div className="text-2xl font-semibold">
            {data?.uptime_seconds != null ? `${Math.round(data.uptime_seconds / 60)} min` : "N/A"}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Restart count</div>
          <div className="text-2xl font-semibold">{data?.restart_count ?? "N/A"}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Workers</div>
          <div className="text-2xl font-semibold">{workers.length}</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Service checks</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            {services.map((s: any) => (
              <div key={s.name} className="flex items-center justify-between">
                <span>{s.name}</span>
                <span
                  className={cx([
                    "px-2 py-0.5 rounded-full text-[11px] border",
                    s.status === "ok"
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      : s.status === "down"
                      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                      : "border-white/10 bg-white/5 text-white/60",
                  ])}
                >
                  {s.status}
                </span>
              </div>
            ))}
            {services.length === 0 && <div className="text-xs text-white/40">No service data.</div>}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Resource stats</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>CPU: {resources.cpu_pct != null ? `${resources.cpu_pct.toFixed(1)}%` : "N/A"}</div>
            <div>
              Memory:{" "}
              {resources.mem_used != null && resources.mem_total != null
                ? `${Math.round((resources.mem_used / resources.mem_total) * 100)}%`
                : "N/A"}
            </div>
            <div>
              Disk:{" "}
              {resources.disk_used != null && resources.disk_total != null
                ? `${Math.round((resources.disk_used / resources.disk_total) * 100)}%`
                : "N/A"}
            </div>
            <div>
              Connections:{" "}
              {connections.current != null ? `${connections.current} / ${connections.available ?? "?"}` : "N/A"}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Dependency status</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            {dependencies.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between">
                <span>{d.name}</span>
                <span
                  className={cx([
                    "px-2 py-0.5 rounded-full text-[11px] border",
                    d.status === "healthy"
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      : d.status === "degraded"
                      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/5 text-white/60",
                  ])}
                >
                  {d.status}
                </span>
              </div>
            ))}
            {dependencies.length === 0 && <div className="text-xs text-white/40">No dependency data.</div>}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Recent incidents</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            {incidents.map((i: any) => (
              <div key={i.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/80">{i.title || "Incident"}</div>
                <div className="text-xs text-white/50 mt-1">
                  {i.created_at ? new Date(i.created_at).toLocaleString() : "-"}
                </div>
              </div>
            ))}
            {incidents.length === 0 && <div className="text-xs text-white/40">No incidents.</div>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Dependency latency</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>DB ping: {latency.db_ms != null ? `${latency.db_ms} ms` : "N/A"}</div>
            <div>Gemini: {latency.gemini_ms != null ? `${latency.gemini_ms} ms` : "N/A"}</div>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Disk IO / Logs</div>
          <div className="mt-3 text-sm text-white/60">Not available (needs OS metrics).</div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white/80">Workers</div>
        <div className="mt-3 grid gap-2 text-sm text-white/60">
          {workers.map((w: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between">
              <span>{w.name}</span>
              <span className="text-xs text-white/50">every {w.interval_seconds}s</span>
              <span className={w.status === "running" ? "text-emerald-300" : "text-rose-300"}>
                {w.status}
              </span>
            </div>
          ))}
          {workers.length === 0 && <div className="text-xs text-white/40">No workers.</div>}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Health history</div>
        <div className="mt-3 grid gap-3 text-sm text-white/60">
          {history.map((h: any, idx: number) => {
            const memPct =
              h.mem_used != null && h.mem_total
                ? Math.round((h.mem_used / h.mem_total) * 100)
                : null;
            const cpuPct = h.cpu_pct != null ? Math.round(h.cpu_pct) : null;
            return (
              <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{h.ts ? new Date(h.ts).toLocaleString() : "-"}</span>
                  <span className={h.db_ok ? "text-emerald-300" : "text-rose-300"}>
                    DB {h.db_ok ? "ok" : "down"}
                  </span>
                  <span className={h.gemini_ok ? "text-emerald-300" : "text-rose-300"}>
                    Gemini {h.gemini_ok ? "ok" : "down"}
                  </span>
                </div>
                <div className="mt-2 grid gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-xs text-white/40">CPU</div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400/70"
                        style={{ width: (cpuPct != null ? String(Math.min(100, Math.max(2, cpuPct))) : "2") + "%" }}
                      />
                    </div>
                    <div className="w-12 text-xs text-white/50 text-right">
                      {cpuPct != null ? String(cpuPct) + "%" : "N/A"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-xs text-white/40">Memory</div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400/70"
                        style={{ width: (memPct != null ? String(Math.min(100, Math.max(2, memPct))) : "2") + "%" }}
                      />
                    </div>
                    <div className="w-12 text-xs text-white/50 text-right">
                      {memPct != null ? String(memPct) + "%" : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {history.length === 0 && <div className="text-xs text-white/40">No history.</div>}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Clock skew</div>
          <div className="mt-2 text-sm text-white/60">Server vs local: {timeSkewStr}</div>
          <div className="mt-2 text-xs text-white/40">
            If skew exceeds ~30s, auth tokens and scheduled jobs can drift.
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Raw status</div>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-white/70">
            {JSON.stringify(data || {}, null, 2)}
          </pre>
          <button
            className="mt-3 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(data || {}, null, 2));
              toast.success("Copied JSON");
            }}
          >
            Copy JSON
          </button>
        </Card>
      </div>
    </div>
  );
}
