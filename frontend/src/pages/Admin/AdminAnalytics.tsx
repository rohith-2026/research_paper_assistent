import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import JSZip from "jszip";
import { apiAdminAnalytics, apiAdminApiUsage, apiAdminDashboard } from "../../api/admin.api";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import { toIstDateKey, toIstIsoString } from "../../utils/time";
import GlassCard from "../../components/GlassCard";
import ParallaxTilt from "../../components/ParallaxTilt";
import Pie3D from "../../components/Pie3D";
import {
  ApiUsageChart,
  ConfidenceChart,
  DonutChart,
  PerformanceChart,
  RetentionChart,
  SubjectTrendsChart,
} from "../../components/Charts";

const rangeOptions = [7, 14, 30, 60, 90];
const ACCENTS = ["#5EE7FF", "#4C7DFF", "#FF4FD8", "#8B5CFF"];

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [apiUsage, setApiUsage] = useState<any>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [live, setLive] = useState(false);
  const reduceMotion = useReducedMotion();

  const load = async (days = rangeDays) => {
    try {
      setLoading(true);
      const [analyticsRes, usageRes, dashboardRes] = await Promise.all([
        apiAdminAnalytics(days),
        apiAdminApiUsage(days),
        apiAdminDashboard(days),
      ]);
      setData(analyticsRes);
      setApiUsage(usageRes);
      setDashData(dashboardRes);
      const serverTime =
        usageRes?.server_time ||
        dashboardRes?.system?.server_time ||
        analyticsRes?.server_time ||
        null;
      setLastUpdated(serverTime ? new Date(serverTime).toLocaleString() : null);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(rangeDays);
  }, [rangeDays]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      load(rangeDays);
    }, 12000);
    return () => clearInterval(id);
  }, [live, rangeDays]);

  const usageDaily = useMemo(
    () => (data?.usage_daily || []).map((d: any, i: number) => ({ x: i, date: d._id, count: d.count || 0 })),
    [data]
  );
  const activeDaily = useMemo(
    () => (data?.active_users || []).map((d: any, i: number) => ({ x: i, date: d.date, count: d.count || 0 })),
    [data]
  );
  const confidenceDaily = useMemo(
    () => (data?.confidence_daily || []).map((d: any, i: number) => ({ x: i, date: d.date, avg: d.avg || 0 })),
    [data]
  );
  const topQueries = useMemo(() => data?.top_queries || [], [data]);
  const topSubjects = useMemo(() => data?.top_subjects || [], [data]);
  const subjectTrends = useMemo(() => data?.subject_trends || {}, [data]);
  const retention = useMemo(() => data?.retention_snapshot || [], [data]);
  const topUsers = useMemo(() => dashData?.top_users || [], [dashData]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading analytics..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  const totalQueries = usageDaily.reduce((sum, d) => sum + d.count, 0);
  const latestActive = activeDaily.slice(-1)[0]?.count || 0;
  const avgConf = data?.avg_confidence ?? 0;
  const drift = data?.confidence_drift?.delta ?? 0;
  const avgDailyQueries = usageDaily.length ? totalQueries / usageDaily.length : 0;
  const peakDailyQueries = usageDaily.reduce((max, d) => Math.max(max, d.count || 0), 0);
  const avgActiveUsers = activeDaily.length
    ? activeDaily.reduce((sum, d) => sum + (d.count || 0), 0) / activeDaily.length
    : 0;
  const topSubject = topSubjects[0]?.subject || "--";
  const topQuery = topQueries[0]?.query || "--";
  const topEndpoint = data?.api_breakdown?.[0]?.endpoint || "--";
  const retentionLatest = data?.retention_snapshot?.slice(-1)[0];
  const retentionRate =
    retentionLatest && retentionLatest.new_users
      ? retentionLatest.active_users / retentionLatest.new_users
      : 0;
  const firstDaily = usageDaily[0]?.count ?? 0;
  const lastDaily = usageDaily.slice(-1)[0]?.count ?? 0;
  const growthRate = firstDaily ? (lastDaily - firstDaily) / firstDaily : 0;

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return `${n}`;
  };

  const lastDate = usageDaily.slice(-1)[0]?.date || toIstDateKey();
  const topQueryRows = topQueries.slice(0, 8).map((q: any, idx: number) => ({
    query: q.query || "Query",
    subject: topSubjects[idx % Math.max(1, topSubjects.length)]?.subject || "General",
    count: q.count || 0,
    last_seen: lastDate,
  }));

  const subjectDonut = topSubjects.slice(0, 4).map((s: any) => ({
    name: s.subject || "Other",
    value: s.count || 0,
  }));

  const topEndpoints = (data?.api_breakdown || []).slice(0, 6);
  const apiStatus = apiUsage?.status_breakdown || {};
  const apiLatency = apiUsage?.latency_avg_ms ?? null;
  const apiTotal = (apiStatus["2xx"] || 0) + (apiStatus["4xx"] || 0) + (apiStatus["5xx"] || 0);
  const maxTopUser = Math.max(...topUsers.map((u: any) => u.count || 0), 1);
  const apiDaily = (apiUsage?.daily || []).map((d: any) => ({
    date: d.date,
    count: d.count || 0,
  }));
  const apiDailyAvg = apiDaily.length
    ? apiDaily.reduce((sum, d) => sum + d.count, 0) / apiDaily.length
    : 0;
  const apiDailyLast = apiDaily.slice(-1)[0]?.count || 0;
  const apiErrorRate = apiTotal ? ((apiStatus["4xx"] || 0) + (apiStatus["5xx"] || 0)) / apiTotal : 0;
  const anomalyDetected = apiErrorRate > 0.05 || (apiDailyAvg > 0 && apiDailyLast > apiDailyAvg * 1.6);

  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      avgConf * 100 - Math.abs(drift * 100) * 4 + retentionRate * 10
    )
  );

  const subjectKeys = Object.keys(subjectTrends).slice(0, 3);
  const subjectTrendData = (() => {
    const allDates = new Set<string>();
    subjectKeys.forEach((k) => (subjectTrends[k] || []).forEach((d: any) => allDates.add(d.date)));
    const dates = Array.from(allDates).sort();
    return dates.map((date) => {
      const row: Record<string, any> = { date };
      subjectKeys.forEach((k) => {
        const entry = (subjectTrends[k] || []).find((d: any) => d.date === date);
        row[k] = entry?.count || 0;
      });
      return row;
    });
  })();

  const refreshLabel = lastUpdated || "Pending";
  const rangeLabel = `${rangeDays}d window`;
  const deltaBadge = (value: number) => {
    const pct = Number.isFinite(value) ? value : 0;
    const up = pct >= 0;
    return {
      text: `${up ? "+" : ""}${pct.toFixed(1)}%`,
      cls: up ? "border-[#5EE7FF]/40 bg-[#5EE7FF]/10 text-[#5EE7FF]" : "border-[#FF4FD8]/40 bg-[#FF4FD8]/10 text-[#FF4FD8]",
    };
  };
  const growthBadge = deltaBadge(growthRate * 100);
  const driftBadge = deltaBadge(drift * 100);
  const retentionBadge = deltaBadge((retentionRate - 0.5) * 100);

  const exportReport = async () => {
    if (!data || !apiUsage || !dashData) return;
    const ts = toIstIsoString().replace(/[:.]/g, "-");
    const zip = new JSZip();

    const csvLines: string[] = [];
    const pushRow = (row: (string | number)[]) => csvLines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

    pushRow(["Analytics Export"]);
    pushRow(["Generated", lastUpdated || toIstIsoString()]);
    pushRow(["Range days", rangeDays]);
    pushRow([]);
    pushRow(["KPI", "Value"]);
    [
      ["Total queries", totalQueries],
      ["Avg daily queries", Math.round(avgDailyQueries)],
      ["Peak daily queries", peakDailyQueries],
      ["Active users", latestActive],
      ["Avg active users", Math.round(avgActiveUsers)],
      ["Avg confidence", avgConf],
      ["Confidence drift", drift],
      ["Top subject", topSubject],
      ["Top query", topQuery],
      ["Top endpoint", topEndpoint],
      ["Retention rate", retentionRate],
      ["Usage growth", growthRate],
      ["Quality score", qualityScore],
      ["API latency avg (ms)", apiLatency ?? ""],
      ["API error rate", apiErrorRate],
    ].forEach((row) => pushRow(row));

    pushRow([]);
    pushRow(["Top queries", "Count"]);
    topQueries.slice(0, 20).forEach((q: any) => pushRow([q.query || "Query", q.count || 0]));

    pushRow([]);
    pushRow(["Top endpoints", "Count"]);
    topEndpoints.forEach((ep: any) => pushRow([ep.endpoint || "endpoint", ep.count || 0]));

    pushRow([]);
    pushRow(["API daily", "Count"]);
    apiDaily.forEach((d) => pushRow([d.date, d.count || 0]));

    pushRow([]);
    pushRow(["Subject mix", "Count"]);
    topSubjects.slice(0, 20).forEach((s: any) => pushRow([s.subject || "subject", s.count || 0]));

    zip.file(`analytics_${ts}.csv`, csvLines.join("\n"));
    zip.file(
      `analytics_${ts}.json`,
      JSON.stringify(
        {
          generated_at: lastUpdated || toIstIsoString(),
          range_days: rangeDays,
          analytics: data,
          api_usage: apiUsage,
          dashboard: dashData,
        },
        null,
        2
      )
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_export_${ts}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const container: any = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08, duration: 0.35, ease: "easeOut" },
    },
  };
  const item: any = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } } };

  return (
    <motion.div
      className="min-h-[70vh] w-full rounded-3xl p-6 relative"
      style={
        {
          "--bg": "#07040F",
          "--panel": "rgba(255,255,255,0.04)",
          "--panelBorder": "rgba(255,255,255,0.10)",
          "--text": "rgba(255,255,255,0.90)",
          "--muted": "rgba(255,255,255,0.55)",
          "--muted2": "rgba(255,255,255,0.35)",
          "--shadow": "0 30px 80px rgba(0,0,0,0.55)",
          background: "var(--bg)",
          color: "var(--text)",
        } as React.CSSProperties
      }
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full" style={{ background: "rgba(217,70,239,0.25)", filter: "blur(120px)" }} />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-[520px] w-[700px] rounded-full" style={{ background: "rgba(99,102,241,0.20)", filter: "blur(120px)" }} />

      <motion.div variants={item} className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.45em] text-[var(--muted2)]">Admin Analytics</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight">Research Intelligence</div>
          <div className="mt-3 text-sm text-[var(--muted)] max-w-2xl">
            Query behavior, subject mix, model quality, and API usage across the platform.
          </div>
        </div>
        <GlassCard className="px-4 py-3 flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--panelBorder)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-white/[0.06]"
            onClick={exportReport}
          >
            Export report
          </button>
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((d) => (
              <button
                key={d}
                className={clsx(
                  "px-3 py-2 rounded-xl text-xs border",
                  rangeDays === d
                    ? "border-[var(--panelBorder)] bg-white/[0.08]"
                    : "border-[var(--panelBorder)] bg-[var(--panel)]"
                )}
                onClick={() => setRangeDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            className={clsx(
              "px-3 py-2 rounded-xl text-xs border",
              live ? "border-[var(--panelBorder)] bg-white/[0.08]" : "border-[var(--panelBorder)] bg-[var(--panel)]"
            )}
            onClick={() => setLive((v) => !v)}
          >
            Live updates
          </button>
        </GlassCard>
      </motion.div>

      <motion.div variants={item} className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70">
          Live
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-[#5EE7FF]" : "bg-white/30"}`} />
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70">
          Range {rangeLabel}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70">
          Last updated {refreshLabel}
        </span>
        <div className="flex items-center gap-2">
          {[
            { label: "Growth", badge: growthBadge },
            { label: "Drift", badge: driftBadge },
            { label: "Retention", badge: retentionBadge },
          ].map((b) => (
            <span
              key={b.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${b.badge.cls}`}
            >
              {b.label} {b.badge.text}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total queries", value: formatNumber(totalQueries) },
          { label: "Avg daily queries", value: formatNumber(Math.round(avgDailyQueries)) },
          { label: "Peak daily queries", value: formatNumber(peakDailyQueries) },
          { label: "Active users", value: formatNumber(latestActive) },
          { label: "Avg active users", value: formatNumber(Math.round(avgActiveUsers)) },
          { label: "Avg confidence", value: avgConf.toFixed(3) },
          { label: "Confidence drift", value: drift.toFixed(3) },
          { label: "Top subject", value: topSubject },
          { label: "Top query", value: topQuery },
          { label: "Top endpoint", value: topEndpoint },
          { label: "Retention rate", value: `${(retentionRate * 100).toFixed(1)}%` },
          { label: "Usage growth", value: `${(growthRate * 100).toFixed(1)}%` },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-[var(--panelBorder)] bg-[var(--panel)] px-4 py-3 shadow-[var(--shadow)]">
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted2)]">{m.label}</div>
            <div className="text-base font-semibold text-[var(--text)] truncate" title={m.value}>
              {m.value}
            </div>
          </div>
        ))}
      </motion.div>

      <div className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
        <span>Core telemetry</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ParallaxTilt className="will-change-transform">
          <GlassCard className={`p-5 ${live ? "ring-1 ring-[#5EE7FF]/30 shadow-[0_0_35px_rgba(94,231,255,0.15)]" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-[var(--muted)]">Query volume</div>
                <div className="mt-1 text-2xl font-semibold">{formatNumber(totalQueries)}</div>
                <div className="mt-2 text-xs text-[var(--muted2)]">Daily queries vs active users</div>
              </div>
              <div className="rounded-xl border border-[var(--panelBorder)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
                Last {rangeDays} days
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border ${growthBadge.cls}`}>
                Growth {growthBadge.text}
              </span>
            </div>
            <div className="mt-4 h-44">
              <PerformanceChart
                data={usageDaily.map((d, i) => ({
                  x: i + 1,
                  read: d.count || 0,
                  write: activeDaily[i]?.count || 0,
                }))}
              />
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className={`p-5 ${drift < 0 ? "ring-1 ring-[#FF4FD8]/30 shadow-[0_0_35px_rgba(255,79,216,0.12)]" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-[var(--muted)]">Model confidence</div>
                <div className="mt-1 text-2xl font-semibold">{avgConf.toFixed(3)}</div>
                <div className="mt-2 text-xs text-[var(--muted2)]">Daily avg confidence trend</div>
              </div>
              <div className="rounded-xl border border-[var(--panelBorder)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
                Drift {(drift * 100).toFixed(1)}%
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border ${driftBadge.cls}`}>
                Drift {driftBadge.text}
              </span>
            </div>
            <div className="mt-4 h-44">
              <ConfidenceChart
                data={confidenceDaily.map((d, i) => ({
                  x: i + 1,
                  value: d.avg || 0,
                }))}
              />
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className={`p-5 ${anomalyDetected ? "ring-1 ring-[#FF4FD8]/30 shadow-[0_0_35px_rgba(255,79,216,0.12)]" : ""}`}>
            <div className="text-sm text-[var(--muted)]">3D API mix</div>
            <div className="mt-1 text-2xl font-semibold">Endpoint share</div>
            <div className="mt-2 text-xs text-[var(--muted2)]">Top endpoints by volume</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border border-white/10 bg-white/[0.04] text-white/70">
                {rangeLabel}
              </span>
            </div>
            <div className="mt-4">
              <Pie3D
                values={topEndpoints.slice(0, 3).map((d: any, i: number) => ({
                  label: d.endpoint || `Metric ${i + 1}`,
                  value: d.count || 1,
                }))}
              />
            </div>
          </GlassCard>
        </ParallaxTilt>
      </motion.div>

      <div className="mt-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
        <span>Query intelligence</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ParallaxTilt className="will-change-transform xl:col-span-2">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Top queries</div>
                <div className="mt-1 text-xs text-white/45">Highest volume prompts in the last range</div>
              </div>
              <div className="text-xs text-white/60">{lastDate}</div>
            </div>
            <div className="mt-4 space-y-3">
              {topQueryRows.map((row) => (
                <div key={row.query} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/85">{row.query}</div>
                    <div className="text-xs text-white/60">{formatNumber(row.count)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/45">
                    <span>Subject: {row.subject}</span>
                    <span>Last seen: {row.last_seen}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#4C7DFF]/70"
                      style={{
                        width: `${Math.max(6, (row.count / Math.max(topQueryRows[0]?.count || 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </ParallaxTilt>

        <div className="grid gap-4">
          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Subject mix</div>
                  <div className="mt-1 text-xs text-white/45">Top research areas</div>
                </div>
                <div className="text-xs text-white/60">Share</div>
              </div>
              <div className="mt-4 h-44">
                <DonutChart data={subjectDonut} />
              </div>
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-5">
              <div className="text-sm text-white/80">API endpoints</div>
              <div className="mt-1 text-xs text-white/45">Traffic share by endpoint</div>
              <div className="mt-4 space-y-2">
                {topEndpoints.slice(0, 6).map((ep: any) => (
                  <div key={ep.endpoint} className="flex items-center gap-3 text-xs text-white/70">
                    <div className="flex-1 truncate">{ep.endpoint}</div>
                    <div className="w-10 text-right">{formatNumber(ep.count || 0)}</div>
                    <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-[#5EE7FF]/70"
                        style={{
                          width: `${Math.max(
                            6,
                            ((ep.count || 0) / Math.max(topEndpoints[0]?.count || 1, 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </ParallaxTilt>
        </div>
      </motion.div>

      <div className="mt-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
        <span>Retention + topics</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Subject trends</div>
                <div className="mt-1 text-xs text-white/45">Top research areas over time</div>
              </div>
              <div className="text-xs text-white/60">{subjectKeys.join(" | ")}</div>
            </div>
            <div className="mt-4 h-48">
              <SubjectTrendsChart data={subjectTrendData} keys={subjectKeys} />
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Retention snapshot</div>
                <div className="mt-1 text-xs text-white/45">New users vs active users</div>
              </div>
              <div className="text-xs text-white/60">{rangeDays}d window</div>
            </div>
            <div className="mt-4 h-48">
              <RetentionChart data={retention} />
            </div>
          </GlassCard>
        </ParallaxTilt>
      </motion.div>

      <div className="mt-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
        <span>API performance</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ParallaxTilt className="will-change-transform lg:col-span-2">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">API traffic trend</div>
                <div className="mt-1 text-xs text-white/45">Requests per day</div>
              </div>
              <div className="text-xs text-white/60">
                Avg latency {apiLatency != null ? `${apiLatency} ms` : "--"}
              </div>
            </div>
            <div className="mt-4 h-48">
              <ApiUsageChart data={apiDaily} />
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Quality score</div>
                <div className="mt-1 text-xs text-white/45">Confidence + retention signal</div>
              </div>
              <div className="text-xs text-white/60">{qualityScore.toFixed(1)} / 100</div>
            </div>
            <div className="mt-4">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-[#5EE7FF]/80"
                  style={{ width: `${qualityScore}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-white/60">
                Higher is better. Penalized by confidence drift and improved by retention.
              </div>
            </div>
          </GlassCard>
        </ParallaxTilt>
      </motion.div>

      <div className="mt-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
        <span>Risk + operators</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">API health</div>
                <div className="mt-1 text-xs text-white/45">Latency + error rate</div>
              </div>
              <div className="text-xs text-white/60">
                {apiLatency != null ? `${apiLatency} ms avg` : "--"}
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] border ${
                  anomalyDetected
                    ? "border-[#FF4FD8]/40 bg-[#FF4FD8]/10 text-[#FF4FD8]"
                    : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {anomalyDetected ? "Anomaly detected" : "Stable traffic"}
              </span>
            </div>
            <div className="mt-4 space-y-3 text-xs text-white/70">
              {[
                { label: "2xx", value: apiStatus["2xx"] || 0, color: "#5EE7FF" },
                { label: "4xx", value: apiStatus["4xx"] || 0, color: "#FF4FD8" },
                { label: "5xx", value: apiStatus["5xx"] || 0, color: "#8B5CFF" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-10">{row.label}</div>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        background: row.color,
                        width: `${Math.max(4, (row.value / Math.max(apiTotal, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-12 text-right">{formatNumber(row.value)}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/80">Top users</div>
                <div className="mt-1 text-xs text-white/45">Query volume leaders</div>
              </div>
              <div className="text-xs text-white/60">{rangeDays}d</div>
            </div>
            <div className="mt-4 space-y-2">
              {topUsers.map((u: any) => (
                <div key={u.user_id} className="flex items-center gap-3 text-xs text-white/70">
                  <div className="flex-1 truncate">{u.email || u.user_id}</div>
                  <div className="w-10 text-right">{formatNumber(u.count || 0)}</div>
                  <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#4C7DFF]/70"
                      style={{
                        width: `${Math.max(6, ((u.count || 0) / maxTopUser) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </ParallaxTilt>
      </motion.div>
    </motion.div>
  );
}
