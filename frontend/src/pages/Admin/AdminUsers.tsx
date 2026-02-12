import { useEffect, useMemo, useState } from "react";
import {
  apiAdminDeleteUser,
  apiAdminDeleteUserData,
  apiAdminExportUser,
  apiAdminUpdateUser,
  apiAdminUsers,
} from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  created_at?: string;
  last_login_at?: string;
  last_active_at?: string;
  queries?: number;
  papers?: number;
  is_active?: boolean;
  activity?: { date: string; count: number }[];
};

const Sparkline = ({ values }: { values: number[] }) => {
  const w = 140;
  const h = 36;
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke="rgba(16, 185, 129, 0.9)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
};

const riskScore = (u: UserRow) => {
  const q = u.queries ?? 0;
  if (q > 500) return { label: "High", color: "text-red-300", bg: "bg-red-500/10" };
  if (q > 150) return { label: "Medium", color: "text-amber-300", bg: "bg-amber-500/10" };
  return { label: "Low", color: "text-emerald-300", bg: "bg-emerald-500/10" };
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const buildTags = (u: UserRow) => {
  const tags: string[] = [];
  const createdAt = u.created_at ? new Date(u.created_at) : null;
  if (createdAt && Date.now() - createdAt.getTime() < 7 * 86400000) tags.push("New");
  if (u.is_active) tags.push("Active");
  if ((u.queries ?? 0) > 150) tags.push("High Usage");
  if (u.role === "admin") tags.push("Admin");
  return tags;
};

const usageSplit = (u: UserRow) => {
  const q = u.queries ?? 0;
  const p = u.papers ?? 0;
  const total = q + p;
  const qPct = total ? Math.round((q / total) * 100) : 0;
  return { q, p, total, qPct };
};

export default function AdminUsers() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [active, setActive] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState<UserRow | null>(null);
  const [savedFilters, setSavedFilters] = useState<{ name: string; value: any }[]>([]);
  const FILTER_KEY = "rpa_admin_user_filters";

  const params = useMemo(() => {
    const p: any = { page, limit, sort_by: sortBy, sort_dir: sortDir };
    if (search.trim()) p.search = search.trim();
    if (role !== "all") p.role = role;
    if (active !== "all") p.is_active = active === "active";
    return p;
  }, [page, limit, sortBy, sortDir, search, role, active]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiAdminUsers(params);
      setData(res);
      if (!current && res?.items?.length) setCurrent(res.items[0]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSavedFilters(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const exportUser = async (userId: string) => {
    try {
      const payload = await apiAdminExportUser(userId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user_${userId}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export complete");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Export failed"));
    }
  };

  const bulkExport = async () => {
    for (const id of selectedIds) {
      // eslint-disable-next-line no-await-in-loop
      await exportUser(id);
    }
  };

  const setUserActive = async (userId: string, isActive: boolean) => {
    try {
      await apiAdminUpdateUser(userId, { is_active: isActive });
      setCurrent((prev) => (prev && prev.id === userId ? { ...prev, is_active: isActive } : prev));
      toast.success(isActive ? "User enabled" : "User disabled");
      await load();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to update user"));
    }
  };

  const bulkSetActive = async (isActive: boolean) => {
    try {
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await apiAdminUpdateUser(id, { is_active: isActive });
      }
      toast.success(isActive ? "Users enabled" : "Users disabled");
      await load();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Bulk update failed"));
    }
  };

  const exportFilteredCsv = async () => {
    try {
      if (total > 5000) {
        const confirm = window.confirm(`This will export ${total} users. Continue?`);
        if (!confirm) return;
      }
      const exportParams = { ...params, page: 1, limit: Math.max(total, items.length || 1) };
      const res = await apiAdminUsers(exportParams);
      const rows: UserRow[] = res?.items || [];
      const payload = rows.map((u) => ({
        name: u.name || "",
        email: u.email || "",
        role: u.role || "",
        queries: u.queries ?? 0,
        papers: u.papers ?? 0,
        last_login_at: u.last_login_at || "",
        last_active_at:
          u.last_active_at ||
          (u.activity && u.activity.length ? u.activity[u.activity.length - 1]?.date : "") ||
          "",
        is_active: u.is_active ? "active" : "disabled",
      }));
      const header = Object.keys(payload[0] || {}).join(",");
      const body = payload.map((r) => Object.values(r).join(",")).join("\n");
      const csv = `${header}\n${body}`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "admin_users_filtered.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "CSV export failed"));
    }
  };

  const removeUserData = async (userId: string) => {
    const confirm = window.confirm("Remove all user data? This cannot be undone.");
    if (!confirm) return;
    await apiAdminDeleteUserData(userId);
    toast.success("User data removed");
    await load();
  };

  const deleteUser = async (userId: string) => {
    const confirm = window.confirm("Delete user account permanently? This cannot be undone.");
    if (!confirm) return;
    await apiAdminDeleteUser(userId);
    toast.success("User deleted");
    setCurrent(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading users..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  const items: UserRow[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
          <h1 className="text-3xl font-black text-white/95">Users</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => bulkSetActive(false)}
            disabled={selectedIds.length === 0}
          >
            Disable selected
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => bulkSetActive(true)}
            disabled={selectedIds.length === 0}
          >
            Enable selected
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={bulkExport}
            disabled={selectedIds.length === 0}
          >
            Export selected
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => setSelected({})}
            disabled={selectedIds.length === 0}
          >
            Clear selection
          </button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.6fr_0.6fr_0.6fr_0.6fr]">
          <input
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
          </select>
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">Newest</option>
            <option value="last_login_at">Last login</option>
            <option value="queries">Queries</option>
            <option value="papers">Papers</option>
          </select>
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              const name = window.prompt("Save filter as");
              if (!name) return;
              const entry = { name, value: { search, role, active, sortBy, sortDir } };
              const next = [...savedFilters, entry];
              setSavedFilters(next);
              localStorage.setItem(FILTER_KEY, JSON.stringify(next));
              toast.success("Filter saved");
            }}
          >
            Save filter
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              setSearch("");
              setRole("all");
              setActive("all");
              setSortBy("created_at");
              setSortDir("desc");
            }}
          >
            Reset
          </button>
          {savedFilters.map((f) => (
            <button
              key={f.name}
              className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
              onClick={() => {
                const v = f.value || {};
                setSearch(v.search || "");
                setRole(v.role || "all");
                setActive(v.active || "all");
                setSortBy(v.sortBy || "created_at");
                setSortDir(v.sortDir || "desc");
              }}
              title="Apply saved filter"
            >
              {f.name}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden">
          <div className="overflow-auto max-h-[560px] scrollbar-custom">
            <table className="min-w-[1120px] w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: "36px" }} />
                <col style={{ width: "280px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "240px" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur">
                <tr className="text-xs text-white/50">
                  <th className="px-3 py-3 text-left" />
                  <th className="px-3 py-3 text-left">User</th>
                  <th className="px-3 py-3 text-left">Usage</th>
                  <th className="px-3 py-3 text-left">Activity</th>
                  <th className="px-3 py-3 text-left">Last Active</th>
                  <th className="px-3 py-3 text-right">Risk</th>
                  <th className="px-3 py-3 text-right">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((u) => {
                  const risk = riskScore(u);
                  const tags = buildTags(u);
                  const activityDate =
                    u.last_active_at ||
                    (u.activity && u.activity.length ? u.activity[u.activity.length - 1]?.date : null);
                  const usage = usageSplit(u);
                  return (
                    <tr
                      key={u.id}
                      className={`group text-sm text-white/70 cursor-pointer ${
                        current?.id === u.id ? "bg-white/5" : ""
                      }`}
                      onClick={() => setCurrent(u)}
                    >
                      <td className="px-3 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={!!selected[u.id]}
                          onChange={() => toggleSelect(u.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="min-w-0">
                          <div className="font-semibold text-white/90 leading-tight">{u.name || "Unnamed"}</div>
                          <div className="text-xs text-white/40 truncate">{u.email}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {tags.length === 0 && <span className="text-[10px] text-white/40">-</span>}
                            {tags.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-baseline gap-3 text-xs text-white/60 whitespace-nowrap">
                          <span>Q {usage.q}</span>
                          <span>P {usage.p}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-2 bg-emerald-400/70" style={{ width: `${usage.qPct}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {u.activity?.length ? (
                          <Sparkline values={u.activity.map((a) => a.count)} />
                        ) : (
                          <span className="text-xs text-white/40">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-xs text-white/60 whitespace-nowrap">
                        {formatDate(activityDate)}
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${risk.bg} ${risk.color} inline-block`}
                          title={`Risk reason: ${risk.label} usage (${u.queries ?? 0} queries)`}
                        >
                          {risk.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            u.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/50"
                          }`}
                        >
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <div className="opacity-0 group-hover:opacity-100 transition inline-flex gap-3 text-xs whitespace-nowrap">
                          <button
                            className="text-emerald-300 hover:text-emerald-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserActive(u.id, !(u.is_active ?? true));
                            }}
                          >
                            {u.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            className="text-white/70 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportUser(u.id);
                            }}
                          >
                            Export
                          </button>
                          <button
                            className="text-white/70 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUserData(u.id);
                            }}
                          >
                            Remove data
                          </button>
                          <button
                            className="text-red-300 hover:text-red-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteUser(u.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          {!current && <div className="text-sm text-white/50">Select a user</div>}
          {current && (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold">{current.name || "Unnamed"}</div>
                <div className="text-xs text-white/50">{current.email}</div>
                <div className="text-xs text-white/50">
                  Last login: {current.last_login_at ? new Date(current.last_login_at).toLocaleString() : "-"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-soft rounded-xl p-3 border border-white/10">
                  <div className="text-xs text-white/50">Queries</div>
                  <div className="text-lg font-semibold">{current.queries ?? 0}</div>
                </div>
                <div className="glass-soft rounded-xl p-3 border border-white/10">
                  <div className="text-xs text-white/50">Papers</div>
                  <div className="text-lg font-semibold">{current.papers ?? 0}</div>
                </div>
              </div>
              <div className="glass-soft rounded-xl p-3 border border-white/10">
                <div className="text-xs text-white/50">Usage breakdown</div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-400/70"
                    style={{
                      width: `${Math.min(
                        100,
                        ((current.queries ?? 0) / Math.max((current.queries ?? 0) + (current.papers ?? 0), 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-white/40">
                  Queries vs Papers
                </div>
              </div>

              <div>
                <div className="text-xs text-white/50">Recent activity</div>
                <div className="mt-2">
                  {current.activity?.length ? (
                    <Sparkline values={current.activity.map((a) => a.count)} />
                  ) : (
                    <div className="text-xs text-white/40">No activity</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-emerald-500 text-black px-4 py-2 text-sm font-semibold"
                  onClick={() => exportUser(current.id)}
                >
                  Export data
                </button>
                <button
                  className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
                  onClick={() => setUserActive(current.id, !(current.is_active ?? true))}
                >
                  {current.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
                  onClick={() => removeUserData(current.id)}
                >
                  Remove data
                </button>
                <button
                  className="rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-2 text-sm"
                  onClick={() => deleteUser(current.id)}
                >
                  Delete user
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <div>
          Page {page} of {totalPages} - {total} users
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[10, 25, 50].map((n) => (
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
        <button
          className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5"
          onClick={exportFilteredCsv}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
