import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiAdminRevokeUserSession, apiAdminUserSessions } from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";

type SessionRow = {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  revoked?: boolean;
  user_agent?: string | null;
  ip?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

export default function AdminSessions() {
  const nav = useNavigate();
  const [items, setItems] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "revoked">("all");
  const [current, setCurrent] = useState<SessionRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = async (nextPage = page, nextLimit = limit) => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);
      const res = await apiAdminUserSessions(nextPage, nextLimit);
      const list = Array.isArray(res?.items) ? res.items : [];
      setItems(list);
      setTotal(res?.total || 0);
      if (!current && list.length) setCurrent(list[0]);
      if (current && !list.find((r: SessionRow) => r.id === current.id)) {
        setCurrent(list[0] || null);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load sessions"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(page, limit);
  }, [page, limit]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      load(page, limit);
    }, 12000);
    return () => clearInterval(id);
  }, [live, page, limit]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      if (status === "active" && s.revoked) return false;
      if (status === "revoked" && !s.revoked) return false;
      if (!q) return true;
      const haystack = [
        s.user_email || "",
        s.user_id || "",
        s.ip || "",
        s.user_agent || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, status]);

  const stats = useMemo(() => {
    let active = 0;
    let revoked = 0;
    const users = new Set<string>();
    const ips = new Set<string>();
    items.forEach((s) => {
      if (s.revoked) revoked += 1;
      else active += 1;
      if (s.user_id) users.add(s.user_id);
      if (s.ip) ips.add(s.ip);
    });
    return { active, revoked, users: users.size, ips: ips.size };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleRevoke = async (row: SessionRow) => {
    if (!row.id) return;
    if (row.revoked) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm("Revoke this session?");
      if (!ok) return;
    }
    try {
      setRevoking(row.id);
      await apiAdminRevokeUserSession(row.id);
      toast.success("Session revoked");
      await load(page, limit);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to revoke session"));
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading sessions..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
          <h1 className="text-3xl font-black text-white/95">Sessions</h1>
          <div className="text-sm text-white/50">Live authentication sessions across the platform.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-2 rounded-full text-xs border ${
              live ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/60"
            }`}
            onClick={() => setLive((v) => !v)}
          >
            Live
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => {
              setRefreshing(true);
              load(page, limit);
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="min-w-0 bg-gradient-to-br from-emerald-500/10 via-white/0 to-white/5">
          <div className="text-xs text-white/50">Total sessions</div>
          <div className="mt-2 text-3xl font-semibold text-white/95">{total}</div>
          <div className="text-xs text-white/40 mt-1">Tracked across all users</div>
        </Card>
        <Card className="min-w-0 bg-gradient-to-br from-emerald-500/10 via-white/0 to-white/5">
          <div className="text-xs text-white/50">Active sessions</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-200">{stats.active}</div>
          <div className="text-xs text-white/40 mt-1">Currently valid</div>
        </Card>
        <Card className="min-w-0 bg-gradient-to-br from-rose-500/10 via-white/0 to-white/5">
          <div className="text-xs text-white/50">Revoked</div>
          <div className="mt-2 text-3xl font-semibold text-rose-200">{stats.revoked}</div>
          <div className="text-xs text-white/40 mt-1">Manual or expired</div>
        </Card>
        <Card className="min-w-0 bg-gradient-to-br from-white/5 via-white/0 to-white/5">
          <div className="text-xs text-white/50">Unique footprint</div>
          <div className="mt-2 text-lg text-white/90">
            {stats.users} users
          </div>
          <div className="text-xs text-white/40">{stats.ips} IPs</div>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-white/5 via-white/0 to-white/5">
        <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.6fr]">
          <input
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
            placeholder="Search email, IP, user id, user agent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="all">All sessions</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 px-3 py-2">
              Active {stats.active}
            </div>
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200 px-3 py-2">
              Revoked {stats.revoked}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 text-white/70 px-3 py-2">
              Users {stats.users}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span>Showing {filtered.length} of {items.length} loaded</span>
          <span>-</span>
          <span>Page {page} of {totalPages}</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card className="bg-gradient-to-br from-white/5 via-white/0 to-white/5">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Session stream</div>
          <div className="space-y-2 max-h-[620px] overflow-auto scrollbar-custom pr-1">
            {filtered.map((row) => {
              const isActive = current?.id === row.id;
              return (
                <button
                  key={row.id}
                  onClick={() => setCurrent(row)}
                  className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-white/90 truncate">{row.user_email || "-"}</div>
                      <div className="text-xs text-white/40 truncate">{row.user_id || "-"}</div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-[11px] border ${
                        row.revoked
                          ? "bg-rose-500/10 text-rose-200 border-rose-400/30"
                          : "bg-emerald-500/10 text-emerald-200 border-emerald-400/30"
                      }`}
                    >
                      {row.revoked ? "revoked" : "active"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/50">
                    <span>IP {row.ip || "-"}</span>
                    <span>Created {formatDate(row.created_at)}</span>
                    <span>Expires {formatDate(row.expires_at)}</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-white/50">No sessions match this filter.</div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-white/50">
            <div>
              Page {page} of {totalPages} - {total} sessions
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
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

        <Card className="min-w-0 overflow-hidden bg-gradient-to-br from-white/5 via-white/0 to-white/5">
          {!current && <div className="text-sm text-white/50">Select a session</div>}
          {current && (
            <div className="space-y-4 min-w-0 max-h-[620px] overflow-auto scrollbar-custom pr-1">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/0 to-white/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-xs text-white/60">
                      S
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white/90 truncate">Session overview</div>
                      <div className="text-xs text-white/50 truncate">{current.user_email || "-"}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[11px] border ${
                      current.revoked
                        ? "bg-rose-500/10 text-rose-200 border-rose-400/30"
                        : "bg-emerald-500/10 text-emerald-200 border-emerald-400/30"
                    }`}
                  >
                    {current.revoked ? "revoked" : "active"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-white/50 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>Created</span>
                    <span className="text-white/80">{formatDate(current.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Expires</span>
                    <span className="text-white/80">{formatDate(current.expires_at)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Identity</div>
                  <div className="mt-3 text-sm text-white/90 break-all">{current.user_email || "-"}</div>
                  <div className="mt-2 text-xs text-white/50 break-all">{current.user_id || "-"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Source</div>
                  <div className="mt-3 text-sm text-white/90 break-all">{current.ip || "-"}</div>
                  <div className="mt-2 text-xs text-white/50 break-words">{current.user_agent || "-"}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/50 mb-2">Quick actions</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/70 hover:text-white"
                    onClick={() => {
                      navigator.clipboard?.writeText(current.user_id || "");
                      toast.success("Copied user id");
                    }}
                  >
                    Copy user id
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/70 hover:text-white"
                    onClick={() => {
                      navigator.clipboard?.writeText(current.user_email || "");
                      toast.success("Copied email");
                    }}
                  >
                    Copy email
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/70 hover:text-white"
                    onClick={() => {
                      navigator.clipboard?.writeText(current.ip || "");
                      toast.success("Copied IP");
                    }}
                  >
                    Copy IP
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg text-xs border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    onClick={() => {
                      if (current.user_id) nav(`/admin/users/${current.user_id}`);
                    }}
                    disabled={!current.user_id}
                  >
                    Open user
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg text-xs border border-rose-400/30 bg-rose-500/10 text-rose-200"
                    onClick={() => handleRevoke(current)}
                    disabled={!!current.revoked || revoking === current.id}
                  >
                    {revoking === current.id ? "Revoking..." : current.revoked ? "Revoked" : "Revoke session"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
