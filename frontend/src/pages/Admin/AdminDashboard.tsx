import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiAdminDashboard } from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (days = rangeDays) => {
    try {
      setLoading(true);
      const res = await apiAdminDashboard(days);
      setData(res);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(rangeDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-300">{error}</div>;
  }

  const totals = data?.totals || {};
  const alerts = data?.alerts || {};
  const kpi = data?.kpi || {};
  const topUsers = data?.top_users || [];
  const heatmap = data?.heatmap || [];
  const audit = data?.audit || [];
  const atRisk = data?.at_risk || [];
  const system = data?.system || {};

  const delta = (a: number, b: number) => {
    if (!b) return 0;
    return Math.round(((a - b) / b) * 100);
  };
  const maxHeat = Math.max(...heatmap.map((d: any) => d.count || 0), 1);
  const maxTop = Math.max(...topUsers.map((d: any) => d.count || 0), 1);
  const maxRisk = Math.max(...atRisk.map((d: any) => d.count || 0), 1);

  const container: any = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08, duration: 0.35, ease: "easeOut" },
    },
  };
  const item: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Control Center</div>
          <h1 className="text-3xl font-black text-white/95">Admin Dashboard</h1>
          <p className="text-sm text-white/60 mt-2 max-w-2xl">
            Global system health, activity trends, and risk signals across all users.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-accent">Live</span>
          <span className="chip">Last {rangeDays} days</span>
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                rangeDays === d
                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
              onClick={() => setRangeDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Users",
            value: totals.users,
            delta: delta(kpi.users_7d || 0, kpi.users_range || 0),
          },
          {
            label: "Queries",
            value: totals.queries,
            delta: delta(kpi.queries_7d || 0, kpi.queries_range || 0),
          },
          {
            label: "Papers",
            value: totals.papers,
            delta: delta(kpi.papers_7d || 0, kpi.papers_range || 0),
          },
        ].map((item) => (
          <Card key={item.label} className="relative overflow-hidden">
            <div className="text-xs text-white/50">{item.label}</div>
            <div className="text-3xl font-semibold">{item.value ?? 0}</div>
            <div className={`text-xs mt-2 ${item.delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              7d vs {rangeDays}d: {item.delta}%
            </div>
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          </Card>
        ))}
      </motion.div>

      <motion.div variants={item} className="grid gap-4 lg:grid-cols-4">
        <Card>
          <div className="text-xs text-white/50">Notes</div>
          <div className="text-2xl font-semibold">{totals.notes ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Downloads</div>
          <div className="text-2xl font-semibold">{totals.downloads ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Feedback</div>
          <div className="text-2xl font-semibold">{totals.feedback ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-white/50">Active sessions</div>
          <div className="text-2xl font-semibold">{totals.active_sessions ?? 0}</div>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white/80">Usage heatmap (30d)</div>
            <div className="text-xs text-white/50">Daily queries</div>
          </div>
          <div className="mt-4 grid gap-2">
            {heatmap.map((d: any) => (
              <div key={d._id} className="flex items-center gap-3 text-sm text-white/60">
                <div className="w-20 text-xs text-white/40">{d._id}</div>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-400/70"
                    style={{ width: `${Math.max(6, (d.count / maxHeat) * 100)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-xs">{d.count}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="text-sm font-semibold text-white/80">System status</div>
            <div className="mt-3 flex items-center justify-between text-sm text-white/60">
              <span>Database</span>
              <span className={system?.db_ok ? "text-emerald-300" : "text-red-300"}>
                {system?.db_ok ? "Healthy" : "Degraded"}
              </span>
            </div>
            <div className="mt-2 text-xs text-white/50">
              {system?.server_time ? new Date(system.server_time).toLocaleString() : "-"}
            </div>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-white/80">Alerts</div>
            <div className="mt-2 text-sm text-white/60">
              Open abuse flags: {alerts.open_abuse_flags ?? 0}
            </div>
            <div className="text-sm text-white/60">
              Feedback last 24h: {alerts.recent_feedback ?? 0}
            </div>
          </Card>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Top user activity</div>
          <div className="mt-3 grid gap-2">
            {topUsers.map((u: any) => (
              <div key={u.user_id} className="flex items-center gap-3 text-sm text-white/60">
                <div className="flex-1 truncate">{u.email || u.user_id}</div>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-cyan-400/70"
                    style={{ width: `${Math.max(6, (u.count / maxTop) * 100)}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs">{u.count}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-white/80">At-risk users</div>
          <div className="mt-3 grid gap-2">
            {atRisk.map((u: any) => (
              <div key={u.user_id} className="flex items-center gap-3 text-sm text-white/60">
                <div className="flex-1 truncate">{u.name || u.email || u.user_id}</div>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-red-400/70"
                    style={{ width: `${Math.max(6, (u.count / maxRisk) * 100)}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs">{u.count}</div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <div className="text-sm font-semibold text-white/80">Recent admin actions</div>
          <div className="mt-3 grid gap-2">
            {audit.map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm text-white/60">
                <span>{a.action}</span>
                <span>{a.created_at ? new Date(a.created_at).toLocaleString() : "-"}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
