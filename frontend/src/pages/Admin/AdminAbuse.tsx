import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiAdminAbuse, apiAdminBlockIp, apiAdminCreateAbuseFlag, apiAdminRevokeUserSessions, apiAdminUpdateAbuseFlag, apiAdminUpdateUser } from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";

const cx = (parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
const FLAG_TYPES = ["rate_limit", "automation", "credential_stuffing", "scraping", "geo_anomaly", "other"];
const FLAG_SEVERITIES = ["info", "warn", "critical"];

export default function AdminAbuse() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiAdminAbuse();
        setData(res);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load abuse detection"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!current && data?.flags?.length) setCurrent(data.flags[0]);
  }, [data, current]);

  const flags = useMemo(() => {
    const list = Array.isArray(data?.flags) ? data.flags : [];
    const q = search.trim().toLowerCase();
    return list.filter((f: any) => {
      if (showOpenOnly && f.resolved) return false;
      if (!q) return true;
      const target = String(f.user_id || f.email || f.reason || "").toLowerCase();
      return target.includes(q);
    });
  }, [data, search, showOpenOnly]);

  const topUsage = Array.isArray(data?.top_usage_users) ? data.top_usage_users : [];
  const maxUsage = Math.max(...topUsage.map((u: any) => u.count || 0), 1);
  const totalFlags = (Array.isArray(data?.flags) ? data.flags : []).length;
  const openFlags = (Array.isArray(data?.flags) ? data.flags : []).filter((f: any) => !f.resolved).length;
  const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
  const spikes = Array.isArray(data?.spikes) ? data.spikes : [];
  const userRisk = Array.isArray(data?.user_risk) ? data.user_risk : [];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading abuse signals..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Security</div>
          <h1 className="text-2xl font-semibold text-white/90">Abuse Detection</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-2 text-xs outline-none focus:border-emerald-300/50"
            placeholder="Search user or reason"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={async () => {
              const reason = window.prompt("Flag reason");
              if (!reason) return;
              const userId = window.prompt("User ID (optional)") || "";
              const ip = window.prompt("IP (optional)") || "";
              const type = window.prompt("Type (optional)") || "";
              const severity = window.prompt("Severity (info/warn/critical, optional)") || "";
              await apiAdminCreateAbuseFlag({
                reason,
                user_id: userId || undefined,
                ip: ip || undefined,
                type: type || undefined,
                severity: severity || undefined,
              });
              toast.success("Flag created");
              const res = await apiAdminAbuse();
              setData(res);
            }}
          >
            Create flag
          </button>
          <button
            className={cx([
              "px-3 py-2 rounded-full text-xs border",
              showOpenOnly ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/60",
            ])}
            onClick={() => setShowOpenOnly((v) => !v)}
          >
            Open only
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs text-white/50">Total flags</div>
          <div className="text-2xl font-semibold">{totalFlags}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Open flags</div>
          <div className="text-2xl font-semibold">{openFlags}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Top usage users</div>
          <div className="text-2xl font-semibold">{topUsage.length}</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="text-sm font-semibold text-white/80">Flags</div>
          <div className="mt-3 grid gap-2">
            {flags.map((f: any) => (
              <div
                key={f.id}
                className={cx([
                  "rounded-xl border p-3 text-sm",
                  current?.id === f.id ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-white/5",
                ])}
                onClick={() => setCurrent(f)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white/80">{f.reason || "Flag"}</span>
                  <span
                    className={cx([
                      "px-2 py-0.5 rounded-full text-[10px] border",
                      f.resolved ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-rose-400/30 bg-rose-500/10 text-rose-200",
                    ])}
                  >
                    {f.resolved ? "resolved" : "open"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                    {f.type || "other"}
                  </span>
                  <span
                    className={cx([
                      "px-2 py-0.5 rounded-full border",
                      f.severity === "critical"
                        ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                        : f.severity === "warn"
                        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
                    ])}
                  >
                    {f.severity || "info"}
                  </span>
                  <span className="text-white/50">
                    {f.user_id || f.email || "Unknown"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-white/50">
                  {f.created_at ? new Date(f.created_at).toLocaleString() : "-"}
                </div>
              </div>
            ))}
            {flags.length === 0 && <div className="text-xs text-white/40">No flags</div>}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="text-sm font-semibold text-white/80">Top API usage</div>
            <div className="mt-3 grid gap-2">
              {topUsage.map((u: any) => (
                <div key={u.user_id} className="flex items-center gap-3 text-sm text-white/60">
                  <div className="flex-1 truncate">{u.email || u.user_id}</div>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-amber-400/70"
                      style={{ width: `${Math.max(6, (u.count / maxUsage) * 100)}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-xs">{u.count}</div>
                </div>
              ))}
              {topUsage.length === 0 && (
                <div className="text-xs text-white/40">No usage data yet.</div>
              )}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-white/80">Selected flag</div>
            {!current && <div className="text-xs text-white/40 mt-3">Select a flag.</div>}
            {current && (
              <div className="mt-3 space-y-3 text-sm text-white/70">
                <div className="text-white/90">{current.reason || "Flag"}</div>
                <div className="text-xs text-white/50">User: {current.user_id || current.email || "-"}</div>
                <div className="text-xs text-white/50">IP: {current.ip || current.ip_address || current?.meta?.ip || "-"}</div>
                <div className="text-xs text-white/50">
                  UA: {current.user_agent || current?.meta?.user_agent || "-"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-white/40">Type</div>
                    <select
                      className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
                      value={current.type || "other"}
                      onChange={async (e) => {
                        const next = e.target.value;
                        await apiAdminUpdateAbuseFlag(current.id, { type: next });
                        setCurrent({ ...current, type: next });
                        toast.success("Updated type");
                      }}
                    >
                      {FLAG_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/40">Severity</div>
                    <select
                      className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
                      value={current.severity || "info"}
                      onChange={async (e) => {
                        const next = e.target.value;
                        await apiAdminUpdateAbuseFlag(current.id, { severity: next });
                        setCurrent({ ...current, severity: next });
                        toast.success("Updated severity");
                      }}
                    >
                      {FLAG_SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                    onClick={async () => {
                      const note = window.prompt("Resolution note (optional)");
                      await apiAdminUpdateAbuseFlag(current.id, { status: "resolved", resolution_note: note || "" });
                      toast.success("Flag resolved");
                      const res = await apiAdminAbuse();
                      setData(res);
                    }}
                  >
                    Resolve
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                    onClick={async () => {
                      const note = window.prompt("Reason for false positive");
                      await apiAdminUpdateAbuseFlag(current.id, { status: "false_positive", resolution_note: note || "" });
                      toast.success("Marked false positive");
                      const res = await apiAdminAbuse();
                      setData(res);
                    }}
                  >
                    False positive
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                    onClick={async () => {
                      const note = window.prompt("Escalation note");
                      await apiAdminUpdateAbuseFlag(current.id, { status: "escalated", resolution_note: note || "" });
                      toast.success("Escalated");
                      const res = await apiAdminAbuse();
                      setData(res);
                    }}
                  >
                    Escalate
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1.5 rounded-full text-xs border border-rose-400/30 bg-rose-500/10 text-rose-200"
                    onClick={async () => {
                      if (!current.user_id) return;
                      await apiAdminUpdateUser(current.user_id, { is_active: false });
                      toast.success("User suspended");
                    }}
                  >
                    Suspend user
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                    onClick={async () => {
                      if (!current.user_id) return;
                      await apiAdminRevokeUserSessions(current.user_id);
                      toast.success("Sessions revoked");
                    }}
                  >
                    Revoke sessions
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                    onClick={async () => {
                      const ip = current.ip || current.ip_address || current?.meta?.ip;
                      if (!ip) return;
                      const reason = window.prompt("Block reason (optional)");
                      await apiAdminBlockIp(ip, reason || "");
                      toast.success("IP blocked");
                    }}
                  >
                    Block IP
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="text-sm font-semibold text-white/80">User risk panel</div>
            <div className="mt-3 grid gap-2 text-sm text-white/60">
              {userRisk.map((u: any) => (
                <div key={u.user_id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{u.email || u.name || u.user_id}</span>
                    <span className="text-xs text-white/50">{u.total_requests || u.count || 0}</span>
                  </div>
                  {u.user_id && (
                    <div className="mt-2">
                      <Link
                        to={`/admin/users/${u.user_id}`}
                        className="text-[11px] text-emerald-200 hover:text-emerald-100"
                      >
                        View user detail
                      </Link>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-white/50">Error rate: {(u.error_rate || 0) * 100}%</div>
                  <div className="text-xs text-white/50">Latency avg: {u.latency_avg_ms || 0} ms</div>
                  <div className="text-xs text-white/50">Last IP: {u.last_ip || "-"}</div>
                  <div className="text-xs text-white/50">
                    Endpoints: {(u.top_endpoints || []).map((e: any) => e.endpoint).join(", ") || "-"}
                  </div>
                </div>
              ))}
              {userRisk.length === 0 && <div className="text-xs text-white/40">No user risk data.</div>}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-white/80">IP/UA clusters</div>
            <div className="mt-3 grid gap-2 text-xs text-white/60">
              {clusters.map((c: any, i: number) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/80">{c.ip}</div>
                  <div className="text-white/40 truncate">{c.user_agent}</div>
                  <div className="text-white/50 mt-1">Flags: {c.count} - Users: {(c.users || []).length}</div>
                </div>
              ))}
              {clusters.length === 0 && <div className="text-xs text-white/40">No clusters yet.</div>}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-white/80">Spike detection</div>
            <div className="mt-3 grid gap-2 text-xs text-white/60">
              {spikes.map((s: any) => (
                <div key={s.date} className="flex items-center justify-between">
                  <span>{s.date}</span>
                  <span>{s.count}</span>
                  <span className={s.level === "High" ? "text-rose-300" : s.level === "Moderate" ? "text-amber-300" : "text-emerald-300"}>
                    {s.level}
                  </span>
                </div>
              ))}
              {spikes.length === 0 && <div className="text-xs text-white/40">No spikes.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
