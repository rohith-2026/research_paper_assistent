import { useEffect, useMemo, useState } from "react";
import { apiAdminAuditLogs } from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";

type AuditRow = {
  id: string;
  admin_id?: string;
  admin_email?: string;
  action?: string;
  meta?: any;
  created_at?: string;
};

const ACTION_TYPES = [
  "all",
  "user",
  "role",
  "security",
  "settings",
  "export",
  "system",
  "other",
];

const severityFor = (action?: string) => {
  const a = (action || "").toLowerCase();
  if (a.includes("delete") || a.includes("disable") || a.includes("revoke")) return "critical";
  if (a.includes("update") || a.includes("edit") || a.includes("change")) return "warn";
  return "info";
};

const typeFor = (action?: string) => {
  const a = (action || "").toLowerCase();
  if (a.includes("user")) return "user";
  if (a.includes("role") || a.includes("permission")) return "role";
  if (a.includes("security") || a.includes("session") || a.includes("revoke")) return "security";
  if (a.includes("setting") || a.includes("config")) return "settings";
  if (a.includes("export")) return "export";
  if (a.includes("system") || a.includes("health")) return "system";
  return "other";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const metaString = (meta: any) => {
  try {
    return JSON.stringify(meta || {});
  } catch {
    return String(meta || "");
  }
};

export default function AdminAuditLog() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [actor, setActor] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [live, setLive] = useState(false);
  const [savedViews, setSavedViews] = useState<{ name: string; value: any }[]>([]);
  const VIEW_KEY = "rpa_admin_audit_views";
  const [range, setRange] = useState("7d");
  const [stickyFilters, setStickyFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [current, setCurrent] = useState<AuditRow | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiAdminAuditLogs(400);
      const list = Array.isArray(res) ? res : res?.items || [];
      setData(list || []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load audit logs"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      load();
    }, 10000);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSavedViews(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setStickyFilters(window.scrollY > 120);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const rangeMs =
      range === "24h"
        ? 24 * 60 * 60 * 1000
        : range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : range === "30d"
        ? 30 * 24 * 60 * 60 * 1000
        : 0;
    return (Array.isArray(data) ? data : []).filter((row) => {
      if (rangeMs) {
        const at = row.created_at ? new Date(row.created_at).getTime() : 0;
        if (now - at > rangeMs) return false;
      }
      const rowAction = row.action || "";
      const rowType = typeFor(rowAction);
      const rowSeverity = severityFor(rowAction);
      const rowActor = (row.admin_email || row.admin_id || "").toLowerCase();
      const rowMeta = metaString(row.meta).toLowerCase();
      const q = search.trim().toLowerCase();
      if (q && !rowActor.includes(q) && !rowAction.toLowerCase().includes(q) && !rowMeta.includes(q))
        return false;
      if (actionType !== "all" && rowType !== actionType) return false;
      if (severity !== "all" && rowSeverity !== severity) return false;
      if (actor.trim() && !rowActor.includes(actor.trim().toLowerCase())) return false;
      if (myOnly && !rowActor.includes("me")) return false;
      return true;
    });
  }, [data, search, actionType, severity, actor, myOnly, range]);

  const severityCounts = useMemo(() => {
    const counts = { info: 0, warn: 0, critical: 0 };
    filtered.forEach((row) => {
      const sev = severityFor(row.action);
      if (sev === "critical") counts.critical += 1;
      else if (sev === "warn") counts.warn += 1;
      else counts.info += 1;
    });
    return counts;
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  useEffect(() => {
    if (!current && paged.length) setCurrent(paged[0]);
    if (current && !filtered.find((r) => r.id === current.id)) {
      setCurrent(paged[0] || null);
    }
  }, [paged, filtered, current]);

  const anomalyMap = useMemo(() => {
    const counts: Record<string, number> = {};
    const now = Date.now();
    data.forEach((row) => {
      const at = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (now - at > 30 * 60 * 1000) return;
      const actorKey = row.admin_email || row.admin_id || "unknown";
      const key = `${actorKey}:${row.action || "action"}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading audit logs..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
          <h1 className="text-3xl font-black text-white/95">Audit Log</h1>
          <div className="text-sm text-white/60 mt-2 max-w-2xl">
            Trace privileged actions, review anomalies, and export evidence.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-2 rounded-full text-xs border ${live ? "border-[#5EE7FF]/40 bg-[#5EE7FF]/10 text-[#5EE7FF]" : "border-white/10 bg-white/5 text-white/60"}`}
            onClick={() => setLive((v) => !v)}
          >
            Live stream
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => load()}
          >
            Refresh
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              const rows = filtered.map((r) => ({
                admin: r.admin_email || r.admin_id || "",
                action: r.action || "",
                type: typeFor(r.action),
                severity: severityFor(r.action),
                time: r.created_at || "",
                meta: metaString(r.meta),
              }));
              const header = Object.keys(rows[0] || {}).join(",");
              const body = rows.map((x) => Object.values(x).join(",")).join("\n");
              const csv = `${header}\n${body}`;
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "audit_log.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "audit_log.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export JSON
          </button>
        </div>
      </div>

      <Card>
        <div
          className={`grid gap-3 lg:grid-cols-[1.5fr_0.6fr_0.6fr_0.6fr_0.6fr] ${
            stickyFilters ? "sticky top-0 z-20 bg-black/80 backdrop-blur p-3 rounded-xl border border-white/10" : ""
          }`}
        >
          <input
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
            placeholder="Search action, actor, target"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          >
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="all">all</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="critical">critical</option>
          </select>
          <input
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
            placeholder="Actor filter"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
          <button
            className={`px-3 py-2 rounded-xl text-xs border ${myOnly ? "border-[#5EE7FF]/40 bg-[#5EE7FF]/10 text-[#5EE7FF]" : "border-white/10 bg-white/5 text-white/60"}`}
            onClick={() => setMyOnly((v) => !v)}
          >
            My actions
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-white/60">
            Range:
            {["24h", "7d", "30d", "all"].map((r) => (
              <button
                key={r}
                className={`px-2 py-1 rounded-full text-[11px] border ${
                  range === r ? "border-[#5EE7FF]/40 bg-[#5EE7FF]/10 text-[#5EE7FF]" : "border-white/10 bg-white/5 text-white/60"
                }`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              const name = window.prompt("Save view as");
              if (!name) return;
              const entry = { name, value: { search, actionType, severity, actor, myOnly } };
              const next = [...savedViews, entry];
              setSavedViews(next);
              localStorage.setItem(VIEW_KEY, JSON.stringify(next));
              toast.success("View saved");
            }}
          >
            Save view
          </button>
          {savedViews.map((v) => (
            <button
              key={v.name}
              className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={() => {
                const s = v.value || {};
                setSearch(s.search || "");
                setActionType(s.actionType || "all");
                setSeverity(s.severity || "all");
                setActor(s.actor || "");
                setMyOnly(!!s.myOnly);
              }}
            >
              {v.name}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(360px,0.9fr)] items-start">
        <Card>
            <div className="overflow-auto max-h-[560px] scrollbar-custom">
            <table className="min-w-[760px] w-full table-fixed border-separate border-spacing-0 text-left">
              <colgroup>
                <col style={{ width: "24px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "240px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "140px" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur">
                <tr className="text-xs text-white/50">
                  <th className="px-3 py-3 text-left"></th>
                  <th className="px-3 py-3 text-left">Severity</th>
                  <th className="px-3 py-3 text-left">Actor</th>
                  <th className="px-3 py-3 text-left">Action</th>
                  <th className="px-3 py-3 text-left">Target</th>
                  <th className="px-3 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paged.map((row) => {
                  const sev = severityFor(row.action);
                  const rowType = typeFor(row.action);
                  const actorLabel = row.admin_email || row.admin_id || "-";
                  const meta = row.meta || {};
                  const target = meta.target || meta.user_id || meta.email || "-";
                  const key = `${actorLabel}:${row.action || "action"}`;
                  const anomalous = (anomalyMap[key] || 0) >= 5;
                  const isActive = current?.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`text-sm text-white/70 cursor-pointer ${isActive ? "bg-white/5" : ""}`}
                      onClick={() => setCurrent(row)}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{
                              background:
                                sev === "critical"
                                  ? "#FF4FD8"
                                  : sev === "warn"
                                  ? "#8B5CFF"
                                  : "#5EE7FF",
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs border ${
                            sev === "critical"
                              ? "border-[#FF4FD8]/40 bg-[#FF4FD8]/10 text-[#FF4FD8]"
                              : sev === "warn"
                              ? "border-[#8B5CFF]/40 bg-[#8B5CFF]/10 text-[#8B5CFF]"
                              : "border-[#5EE7FF]/40 bg-[#5EE7FF]/10 text-[#5EE7FF]"
                          }`}
                        >
                          {sev}
                        </span>
                        {anomalous && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] border border-[#FF4FD8]/40 bg-[#FF4FD8]/10 text-[#FF4FD8]">
                            anomaly
                          </span>
                        )}
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/60 border border-white/10">
                          {rowType}
                        </span>
                      </td>
                      <td className="px-3 py-3 truncate">{actorLabel}</td>
                      <td className="px-3 py-3 truncate">{row.action || "-"}</td>
                      <td className="px-3 py-3 truncate">{target}</td>
                      <td className="px-3 py-3 text-xs text-white/50">{formatDate(row.created_at)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-sm text-white/50">
                      No audit logs match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/50">
              <div>
                Page {page} of {totalPages} - {filtered.length} events
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
                <button
                  className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <button
                  className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
        </Card>

        <Card className="h-fit self-start min-w-[360px]">
          {!current && <div className="text-sm text-white/50">Select an event</div>}
          {current && (() => {
            const sev = severityFor(current.action);
              const actorLabel = current.admin_email || current.admin_id || "-";
              const meta = current.meta || {};
              const target = meta.target || meta.user_id || meta.email || "-";
              const ip = meta.ip || meta.ip_address || "-";
              const device = meta.device || meta.user_agent || "-";
              const source = meta.source || "UI";
              return (
                <div className="space-y-5">
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-3">
                    <div className="text-white/40">Severity</div>
                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          sev === "critical"
                            ? "bg-[#FF4FD8]/10 text-[#FF4FD8]"
                            : sev === "warn"
                            ? "bg-[#8B5CFF]/10 text-[#8B5CFF]"
                            : "bg-[#5EE7FF]/10 text-[#5EE7FF]"
                        }`}
                      >
                        {sev}
                      </span>
                    </div>

                    <div className="text-white/40">Actor</div>
                    <div className="min-w-0 flex items-center gap-2">
                      <code className="min-w-0 max-w-full overflow-x-auto whitespace-nowrap rounded-lg bg-white/5 px-3 py-2 font-mono text-sm text-white/85">
                        {actorLabel}
                      </code>
                      <button
                        className="text-xs text-white/50 hover:text-white"
                        onClick={() => {
                          navigator.clipboard?.writeText(actorLabel);
                          toast.success("Copied actor");
                        }}
                      >
                        Copy
                      </button>
                    </div>

                    <div className="text-white/40">Action</div>
                    <div className="text-white/85">{current.action || "-"}</div>

                    <div className="text-white/40">Target</div>
                    <div className="min-w-0 flex items-center gap-2">
                      <code className="rounded-lg bg-white/5 px-3 py-2 font-mono text-sm text-white/85">
                        {String(target)}
                      </code>
                      <button
                        className="text-xs text-white/50 hover:text-white"
                        onClick={() => {
                          navigator.clipboard?.writeText(String(target));
                          toast.success("Copied target");
                        }}
                      >
                        Copy
                      </button>
                    </div>

                    <div className="text-white/40">Source</div>
                    <div className="text-white/85">{source}</div>

                    <div className="text-white/40">IP</div>
                    <div className="text-white/85 font-mono">{ip}</div>

                    <div className="text-white/40">Device</div>
                    <div className="text-white/70 break-words">{device}</div>

                    <div className="text-white/40">Time</div>
                    <div className="text-white/85">{formatDate(current.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40">Raw payload</div>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-white/70 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      {metaString(current.meta)}
                    </pre>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/60"
                      onClick={() => {
                        navigator.clipboard?.writeText(metaString(current.meta));
                        toast.success("Copied JSON");
                      }}
                    >
                      Copy JSON
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/60"
                      onClick={() => {
                        navigator.clipboard?.writeText(actorLabel);
                        toast.success("Copied actor");
                      }}
                    >
                      Copy actor
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/60"
                      onClick={() => {
                        navigator.clipboard?.writeText(String(target));
                        toast.success("Copied target");
                      }}
                    >
                      Copy target
                    </button>
                  </div>
                </div>
              );
          })()}
        </Card>
      </div>
    </div>
  );
}
