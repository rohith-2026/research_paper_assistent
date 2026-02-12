import { useEffect, useMemo, useState } from "react";
import {
  apiAdminCompliance,
  apiAdminComplianceAccessReview,
  apiAdminCompliancePolicyAck,
  apiAdminComplianceUpdateBadge,
  apiAdminComplianceCreateBadge,
  apiAdminCompliancePiiScan,
  apiAdminComplianceErrorScan,
  apiAdminComplianceDbScan,
  apiAdminComplianceApiErrorScan,
  apiAdminComplianceFrontendScan,
  apiAdminComplianceDependencyScan,
  apiAdminComplianceStorageScan,
  apiAdminComplianceAuthScan,
  apiAdminCompliancePurgeRun,
  apiAdminComplianceCreateJob,
  apiAdminComplianceUpdateJob,
  apiAdminComplianceUploadEvidence,
  apiAdminExportUser,
  apiAdminSettings,
  apiAdminUpdateSettings,
} from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";

const cx = (parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type ActivityItem = {
  id: string;
  type:
    | "pii_scan"
    | "error_scan"
    | "db_scan"
    | "api_error_scan"
    | "frontend_scan"
    | "dependency_scan"
    | "storage_scan"
    | "auth_scan"
    | "purge_run"
    | "access_review"
    | "badge";
  title: string;
  created_at?: string;
  data: any;
};

export default function AdminCompliance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  const [badges, setBadges] = useState<any[]>([]);
  const [pii, setPii] = useState<any | null>(null);
  const [errorScan, setErrorScan] = useState<any | null>(null);
  const [dbScan, setDbScan] = useState<any | null>(null);
  const [apiScan, setApiScan] = useState<any | null>(null);
  const [frontendScan, setFrontendScan] = useState<any | null>(null);
  const [dependencyScan, setDependencyScan] = useState<any | null>(null);
  const [storageScan, setStorageScan] = useState<any | null>(null);
  const [authScan, setAuthScan] = useState<any | null>(null);
  const [accessReviews, setAccessReviews] = useState<any[]>([]);
  const [purgeRuns, setPurgeRuns] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [policyAck, setPolicyAck] = useState<any[]>([]);
  const [badgeHistory, setBadgeHistory] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobRuns, setJobRuns] = useState<any[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [retention, setRetention] = useState<number>(90);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [scanningAll, setScanningAll] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiAdminCompliance();
      setBadges(Array.isArray(res?.badges) ? res.badges : []);
      setPii(res?.pii_scan || null);
      setErrorScan(res?.error_scan || null);
      setDbScan(res?.db_scan || null);
      setApiScan(res?.api_scan || null);
      setFrontendScan(res?.frontend_scan || null);
      setDependencyScan(res?.dependency_scan || null);
      setStorageScan(res?.storage_scan || null);
      setAuthScan(res?.auth_scan || null);
      setAccessReviews(Array.isArray(res?.access_reviews) ? res.access_reviews : []);
      setPurgeRuns(Array.isArray(res?.purge_runs) ? res.purge_runs : []);
      setPolicies(Array.isArray(res?.policies) ? res.policies : []);
      setPolicyAck(Array.isArray(res?.policy_ack) ? res.policy_ack : []);
      setBadgeHistory(Array.isArray(res?.badge_history) ? res.badge_history : []);
      setJobs(Array.isArray(res?.jobs) ? res.jobs : []);
      setJobRuns(Array.isArray(res?.job_runs) ? res.job_runs : []);
      const settings = await apiAdminSettings();
      if (settings?.data_retention_days) setRetention(settings.data_retention_days);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load compliance data"));
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

  const activity = useMemo(() => {
    const items: ActivityItem[] = [];
    if (pii) {
      items.push({
        id: String(pii.id || "pii"),
        type: "pii_scan",
        title: "PII scan completed",
        created_at: pii.created_at,
        data: pii,
      });
    }
    if (errorScan) {
      items.push({
        id: String(errorScan.id || "error_scan"),
        type: "error_scan",
        title: "Error scan completed",
        created_at: errorScan.created_at,
        data: errorScan,
      });
    }
    if (dbScan) {
      items.push({
        id: String(dbScan.id || "db_scan"),
        type: "db_scan",
        title: "DB scan completed",
        created_at: dbScan.created_at,
        data: dbScan,
      });
    }
    if (apiScan) {
      items.push({
        id: String(apiScan.id || "api_error_scan"),
        type: "api_error_scan",
        title: "API error scan completed",
        created_at: apiScan.created_at,
        data: apiScan,
      });
    }
    if (frontendScan) {
      items.push({
        id: String(frontendScan.id || "frontend_scan"),
        type: "frontend_scan",
        title: "Frontend scan completed",
        created_at: frontendScan.created_at,
        data: frontendScan,
      });
    }
    if (dependencyScan) {
      items.push({
        id: String(dependencyScan.id || "dependency_scan"),
        type: "dependency_scan",
        title: "Dependency scan completed",
        created_at: dependencyScan.created_at,
        data: dependencyScan,
      });
    }
    if (storageScan) {
      items.push({
        id: String(storageScan.id || "storage_scan"),
        type: "storage_scan",
        title: "Storage scan completed",
        created_at: storageScan.created_at,
        data: storageScan,
      });
    }
    if (authScan) {
      items.push({
        id: String(authScan.id || "auth_scan"),
        type: "auth_scan",
        title: "Auth scan completed",
        created_at: authScan.created_at,
        data: authScan,
      });
    }
    purgeRuns.forEach((r: any) => {
      items.push({
        id: String(r.id || "purge"),
        type: "purge_run",
        title: "Purge run " + (r.status || "completed"),
        created_at: r.completed_at || r.created_at,
        data: r,
      });
    });
    accessReviews.forEach((r: any) => {
      items.push({
        id: String(r.id || "review"),
        type: "access_review",
        title: "Access review",
        created_at: r.created_at,
        data: r,
      });
    });
    badges.forEach((b: any) => {
      items.push({
        id: String(b.id || b.name || "badge"),
        type: "badge",
        title: "Badge " + (b.name || "unknown"),
        created_at: b.updated_at,
        data: b,
      });
    });
    items.sort((a, b) => {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    });
    return items.filter((item) => {
      if (filterType !== "all" && item.type !== filterType) return false;
      const ts = item.created_at ? new Date(item.created_at).getTime() : 0;
      if (filterStart) {
        const s = new Date(filterStart).getTime();
        if (ts && ts < s) return false;
      }
      if (filterEnd) {
        const e = new Date(filterEnd + "T23:59:59").getTime();
        if (ts && ts > e) return false;
      }
      return true;
    });
  }, [pii, errorScan, dbScan, apiScan, frontendScan, dependencyScan, storageScan, authScan, purgeRuns, accessReviews, badges, filterType, filterStart, filterEnd]);

  useEffect(() => {
    if (!selected && activity.length) setSelected(activity[0]);
    if (selected && !activity.find((a) => a.id === selected.id)) {
      setSelected(activity[0] || null);
    }
  }, [activity, selected]);

  const saveRetention = async () => {
    try {
      setSaving(true);
      await apiAdminUpdateSettings({ data_retention_days: retention });
      toast.success("Retention policy saved");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to save retention"));
    } finally {
      setSaving(false);
    }
  };

  const runAllScans = async () => {
    try {
      setScanningAll(true);
      await apiAdminCompliancePiiScan({ run: true });
      await apiAdminComplianceErrorScan({ run: true, max_lines: 2000 });
      await apiAdminComplianceDbScan({ run: true });
      await apiAdminComplianceApiErrorScan({ run: true, range_days: 1 });
      await apiAdminComplianceFrontendScan({ run: true });
      await apiAdminComplianceDependencyScan({ run: true });
      await apiAdminComplianceStorageScan({ run: true });
      await apiAdminComplianceAuthScan({ run: true });
      toast.success("All scans completed");
      await load();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to run all scans"));
    } finally {
      setScanningAll(false);
    }
  };

  const exportUser = async () => {
    try {
      const payload = await apiAdminExportUser(userId.trim());
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "user_" + userId.trim() + "_export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("User data exported");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to export user data"));
    }
  };

  const uploadEvidence = async (badge: any, file: File | null) => {
    if (!file) return;
    const res = await apiAdminComplianceUploadEvidence(file);
    const url = res?.url;
    if (!url) return;
    const nextEvidence = [...(badge.evidence || []), url];
    await apiAdminComplianceUpdateBadge(badge.id, {
      name: badge.name,
      status: badge.status,
      evidence: nextEvidence,
    });
    toast.success("Evidence uploaded");
    await load();
  };

  const acked = (policyId: string) => {
    return !!policyAck.find((a: any) => a.policy_id === policyId && a.acknowledged);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading compliance..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Governance</div>
          <h1 className="text-2xl font-semibold text-white/90">Compliance Center</h1>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className="px-3 py-2 rounded-full text-xs border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 disabled:opacity-50"
            onClick={runAllScans}
            disabled={scanningAll}
          >
            {scanningAll ? "Running scans..." : "Run all scans"}
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => load()}
          >
            Refresh
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
          <span>Filters:</span>
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">all</option>
            <option value="pii_scan">PII scan</option>
            <option value="error_scan">Error scan</option>
            <option value="db_scan">DB scan</option>
            <option value="api_error_scan">API error scan</option>
            <option value="frontend_scan">Frontend scan</option>
            <option value="dependency_scan">Dependency scan</option>
            <option value="storage_scan">Storage scan</option>
            <option value="auth_scan">Auth scan</option>
            <option value="purge_run">Purge run</option>
            <option value="access_review">Access review</option>
            <option value="badge">Badge</option>
          </select>
          <input
            type="date"
            className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
          />
          <input
            type="date"
            className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="text-sm font-semibold text-white/80">Activity</div>
          <div className="mt-3 grid gap-2">
            {activity.map((a) => (
              <div
                key={a.id}
                className={cx([
                  "rounded-xl border p-3 text-sm",
                  selected?.id === a.id ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-white/5",
                ])}
                onClick={() => setSelected(a)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white/80">{a.title}</span>
                  <span className="text-xs text-white/50">
                    {a.created_at ? new Date(a.created_at).toLocaleString() : "-"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-white/50">Type: {a.type}</div>
              </div>
            ))}
            {activity.length === 0 && <div className="text-xs text-white/40">No compliance activity yet.</div>}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white/80">Detail</div>
          {!selected && <div className="text-xs text-white/40 mt-3">Select an item.</div>}
          {selected && (
            <div className="mt-3 space-y-3 text-sm text-white/70">
              <div className="text-white/90">{selected.title}</div>
              <div className="text-xs text-white/50">Type: {selected.type}</div>
              <div className="text-xs text-white/50">
                Time: {selected.created_at ? new Date(selected.created_at).toLocaleString() : "-"}
              </div>
              {selected.type === "badge" && (
                <div className="text-xs text-white/50">
                  Evidence: {(selected.data?.evidence || []).join(", ") || "None"}
                </div>
              )}
              {selected.type === "access_review" && (
                <div className="text-xs text-white/50">
                  Admin: {selected.data?.admin_email || selected.data?.admin_id || "-"}
                </div>
              )}
              {selected.type === "pii_scan" && (
                <div className="text-xs text-white/50">
                  Emails: {selected.data?.email_count || 0} - IPs: {selected.data?.ip_count || 0} - Phones: {selected.data?.phone_count || 0}
                </div>
              )}
              {selected.type === "error_scan" && (
                <div className="text-xs text-white/50">
                  Errors: {selected.data?.error_count || 0} - Warnings: {selected.data?.warning_count || 0}
                </div>
              )}
              {selected.type === "db_scan" && (
                <div className="text-xs text-white/50">
                  OK: {String(selected.data?.db_ok)} - Latency: {selected.data?.db_latency_ms ?? "N/A"} ms
                </div>
              )}
              {selected.type === "api_error_scan" && (
                <div className="text-xs text-white/50">
                  4xx: {selected.data?.status_4xx || 0} - 5xx: {selected.data?.status_5xx || 0}
                </div>
              )}
              {selected.type === "frontend_scan" && (
                <div className="text-xs text-white/50">
                  Dist: {selected.data?.dist_present ? "yes" : "no"} - Build: {selected.data?.build_present ? "yes" : "no"}
                </div>
              )}
              {selected.type === "dependency_scan" && (
                <div className="text-xs text-white/50">
                  Status: {selected.data?.status || "not_configured"}
                </div>
              )}
              {selected.type === "storage_scan" && (
                <div className="text-xs text-white/50">
                  Disk used: {selected.data?.disk_used ?? "N/A"}
                </div>
              )}
              {selected.type === "auth_scan" && (
                <div className="text-xs text-white/50">
                  Admin sessions: {selected.data?.admin_sessions ?? 0} - User sessions: {selected.data?.user_sessions ?? 0}
                </div>
              )}
              {selected.type === "purge_run" && (
                <div className="text-xs text-white/50">
                  Deleted: {selected.data?.records_deleted || 0} records
                </div>
              )}
              <pre className="mt-2 whitespace-pre-wrap text-xs text-white/70">
                {JSON.stringify(selected.data || {}, null, 2)}
              </pre>
              {selected.type === "badge" && (
                <div className="mt-2">
                  <div className="text-xs text-white/40">Recent changes</div>
                  <div className="mt-2 grid gap-2 text-xs text-white/60">
                    {badgeHistory
                      .filter((h) => h.badge_id === selected.data?.id)
                      .slice(0, 5)
                      .map((h) => (
                        <div key={h.id} className="rounded-xl border border-white/10 bg-white/5 p-2">
                          <div>{h.created_at ? new Date(h.created_at).toLocaleString() : "-"}</div>
                          <div>Before: {JSON.stringify(h.before || {})}</div>
                          <div>After: {JSON.stringify(h.after || {})}</div>
                        </div>
                      ))}
                    {badgeHistory.filter((h) => h.badge_id === selected.data?.id).length === 0 && (
                      <div className="text-xs text-white/40">No change history.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Data retention</div>
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <input
              type="number"
              className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50 w-40"
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
              min={1}
            />
            <button
              onClick={saveRetention}
              disabled={saving}
              className="rounded-xl bg-emerald-500 text-black px-4 py-2 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save policy"}
            </button>
            <button
              className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                const deleted = Number(window.prompt("Records deleted", "0") || "0");
                await apiAdminCompliancePurgeRun({ records_deleted: deleted, status: "completed" });
                toast.success("Purge run recorded");
                await load();
              }}
            >
              Record purge run
            </button>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white/80">Export user data</div>
          <div className="mt-3 flex gap-3 items-center">
            <input
              className="flex-1 rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <button
              onClick={exportUser}
              className="rounded-xl bg-emerald-500 text-black px-4 py-2 text-sm font-semibold hover:bg-emerald-400"
            >
              Export
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">PII scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>Email patterns: {pii?.email_count ?? "Not scanned"}</div>
            <div>IP patterns: {pii?.ip_count ?? "Not scanned"}</div>
            <div>Phone patterns: {pii?.phone_count ?? "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {pii?.created_at ? new Date(pii.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminCompliancePiiScan({ run: true });
                toast.success("PII scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Access reviews</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>Last review: {accessReviews[0]?.created_at ? new Date(accessReviews[0].created_at).toLocaleString() : "Not recorded"}</div>
            <div>Scope: {accessReviews[0]?.scope || "admin_access"}</div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                const notes = window.prompt("Review notes (optional)") || "";
                await apiAdminComplianceAccessReview({ scope: "admin_access", notes });
                toast.success("Access review recorded");
                await load();
              }}
            >
              Record review
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Error scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>Errors: {errorScan?.error_count ?? "Not scanned"}</div>
            <div>Warnings: {errorScan?.warning_count ?? "Not scanned"}</div>
            <div>Lines checked: {errorScan?.line_count ?? "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {errorScan?.created_at ? new Date(errorScan.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminComplianceErrorScan({ run: true, max_lines: 2000 });
                toast.success("Error scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Recent error lines</div>
          <div className="mt-3 grid gap-2 text-xs text-white/60">
            {(errorScan?.recent_errors || []).slice(-6).map((ln: string, idx: number) => (
              <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-2">
                {ln}
              </div>
            ))}
            {(errorScan?.recent_errors || []).length === 0 && (
              <div className="text-xs text-white/40">No recent errors captured.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">DB scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>DB ok: {dbScan?.db_ok != null ? String(dbScan.db_ok) : "Not scanned"}</div>
            <div>Latency: {dbScan?.db_latency_ms ?? "Not scanned"} ms</div>
            <div>Collections: {dbScan?.collections ?? "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {dbScan?.created_at ? new Date(dbScan.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminComplianceDbScan({ run: true });
                toast.success("DB scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">API error scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>4xx: {apiScan?.status_4xx ?? "Not scanned"}</div>
            <div>5xx: {apiScan?.status_5xx ?? "Not scanned"}</div>
            <div>Total: {apiScan?.total_requests ?? "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {apiScan?.created_at ? new Date(apiScan.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminComplianceApiErrorScan({ run: true, range_days: 1 });
                toast.success("API error scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Frontend scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>Dist present: {frontendScan?.dist_present != null ? String(frontendScan.dist_present) : "Not scanned"}</div>
            <div>Build present: {frontendScan?.build_present != null ? String(frontendScan.build_present) : "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {frontendScan?.created_at ? new Date(frontendScan.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminComplianceFrontendScan({ run: true });
                toast.success("Frontend scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Dependency scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>Status: {dependencyScan?.status ?? "Not scanned"}</div>
            <div>Files: {(dependencyScan?.files || []).join(", ") || "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {dependencyScan?.created_at ? new Date(dependencyScan.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminComplianceDependencyScan({ run: true });
                toast.success("Dependency scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Storage scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>Disk used: {storageScan?.disk_used ?? "Not scanned"}</div>
            <div>Uploads bytes: {storageScan?.uploads_bytes ?? "Not scanned"}</div>
            <div>Artifacts bytes: {storageScan?.artifacts_bytes ?? "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {storageScan?.created_at ? new Date(storageScan.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminComplianceStorageScan({ run: true });
                toast.success("Storage scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Auth scan</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            <div>Admin sessions: {authScan?.admin_sessions ?? "Not scanned"}</div>
            <div>User sessions: {authScan?.user_sessions ?? "Not scanned"}</div>
            <div>Blocked IPs: {authScan?.blocked_ips ?? "Not scanned"}</div>
            <div className="text-xs text-white/40">
              Last scan: {authScan?.created_at ? new Date(authScan.created_at).toLocaleString() : "Not recorded"}
            </div>
            <button
              className="mt-2 px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                await apiAdminComplianceAuthScan({ run: true });
                toast.success("Auth scan completed");
                await load();
              }}
            >
              Run scan now
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Compliance badges</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            {badges.map((b: any) => (
              <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span>{b.name}</span>
                  <span className="text-xs text-white/50">{b.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(b.evidence || []).map((e: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] border border-white/10 bg-white/5 text-white/60">
                      {e}
                    </span>
                  ))}
                </div>
                <button
                  className="mt-2 px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                  onClick={async () => {
                    const status = window.prompt("Status (planned/in-progress/complete)", b.status || "planned");
                    if (!status) return;
                    const evidence = window.prompt("Evidence links (comma separated)", (b.evidence || []).join(",")) || "";
                    await apiAdminComplianceUpdateBadge(b.id, {
                      name: b.name,
                      status: status,
                      evidence: evidence.split(",").map((x) => x.trim()).filter(Boolean),
                    });
                    toast.success("Badge updated");
                    await load();
                  }}
                >
                  Update
                </button>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => uploadEvidence(b, e.target.files?.[0] || null)}
                  />
                  <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5">Upload evidence</span>
                </label>
              </div>
            ))}
            {badges.length === 0 && (
              <button
                className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                onClick={async () => {
                  const name = window.prompt("Badge name");
                  if (!name) return;
                  const status = window.prompt("Status (planned/in-progress/complete)", "planned") || "planned";
                  await apiAdminComplianceCreateBadge({ name, status });
                  toast.success("Badge created");
                  await load();
                }}
              >
                Create badge
              </button>
            )}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">Policy acknowledgements</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            {policies.map((p: any) => (
              <label key={p.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acked(p.id)}
                  onChange={(e) => apiAdminCompliancePolicyAck(p.id, e.target.checked).then(load)}
                />
                <span>{p.name}</span>
                {policyAck.find((a: any) => a.policy_id === p.id && a.acknowledged) && (
                  <span className="text-[10px] text-white/40">
                    by {policyAck.find((a: any) => a.policy_id === p.id && a.acknowledged)?.admin_email || "admin"}
                  </span>
                )}
              </label>
            ))}
            {policies.length === 0 && <div className="text-xs text-white/40">No policies configured.</div>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white/80">Scheduled jobs</div>
        <div className="mt-3 grid gap-2 text-sm text-white/60">
          {jobs.map((j: any) => (
            <div key={j.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <span>{j.type}</span>
                <span className="text-xs text-white/50">{j.status}</span>
              </div>
              <div className="text-xs text-white/50">Schedule: {j.schedule || "-"}</div>
              <div className="text-xs text-white/50">Next run: {j.next_run_at ? new Date(j.next_run_at).toLocaleString() : "-"}</div>
              <button
                className="mt-2 px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
                onClick={async () => {
                  const status = window.prompt("Status (scheduled/paused/completed)", j.status || "scheduled") || j.status;
                  const schedule = window.prompt("Cron/interval", j.schedule || "") || j.schedule;
                  await apiAdminComplianceUpdateJob(j.id, { status, schedule });
                  toast.success("Job updated");
                  await load();
                }}
              >
                Update job
              </button>
            </div>
          ))}
          {jobs.length === 0 && (
            <button
              className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={async () => {
                const type = window.prompt("Job type (pii_scan/purge_run/error_scan/db_scan/api_error_scan/frontend_scan/dependency_scan/storage_scan/auth_scan)");
                if (!type) return;
                const schedule = window.prompt("Cron/interval (e.g. 0 2 * * *)", "");
                await apiAdminComplianceCreateJob({ type, schedule, status: "scheduled" });
                toast.success("Job created");
                await load();
              }}
            >
              Create job
            </button>
          )}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Job execution log</div>
        <div className="mt-3 grid gap-2 text-sm text-white/60">
          {jobRuns.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <span>{r.type}</span>
                <span className={r.status === "failed" ? "text-rose-300" : "text-emerald-300"}>{r.status}</span>
              </div>
              <div className="text-xs text-white/50">
                {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
              </div>
              {r.message && <div className="text-xs text-white/50 mt-1">{r.message}</div>}
            </div>
          ))}
          {jobRuns.length === 0 && <div className="text-xs text-white/40">No job runs recorded.</div>}
        </div>
      </Card>
    </div>
  );
}
