import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import PageShell from "../../components/layout/PageShell";
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
import {
  apiAnalyticsConfidence,
  apiAnalyticsOverview,
  apiAnalyticsSubjects,
} from "../../api/analytics.api";
import {
  apiHistory,
  apiListSavedPapers,
  HistoryItem,
  SavedPaper,
} from "../../api/assistant.api";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import { getIstHour, startOfIstDay, toIstDateKey } from "../../utils/time";

const rangeOptions = [7, 14, 30, 60, 90];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [overview, setOverview] = useState<any>(null);
  const [confidence, setConfidence] = useState<any>(null);
  const [subjects, setSubjects] = useState<Record<string, { date: string; count: number }[]>>({});
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [live, setLive] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const [goalWeeklyQueries, setGoalWeeklyQueries] = useState(75);
  const [goalConfidence, setGoalConfidence] = useState(0.8);
  const [goalSavedPapers, setGoalSavedPapers] = useState(15);
  const reduceMotion = useReducedMotion();

  const rangeDates = useMemo(() => {
    const end = startOfIstDay(new Date());
    const start = new Date(end.getTime() - rangeDays * 86400000);
    const toISO = (d: Date) => toIstDateKey(d);
    return { start: toISO(start), end: toISO(end) };
  }, [rangeDays]);

  const load = async () => {
    try {
      setLoading(true);
      const [o, c, s, h, sp] = await Promise.all([
        apiAnalyticsOverview(),
        apiAnalyticsConfidence(rangeDates.start, rangeDates.end),
        apiAnalyticsSubjects(rangeDates.start, rangeDates.end),
        apiHistory(200, 0),
        apiListSavedPapers(100, 0),
      ]);
      setOverview(o);
      setConfidence(c);
      setSubjects(s || {});
      setHistoryItems(h.items || []);
      setSavedPapers(sp || []);
      setError(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [rangeDates.start, rangeDates.end]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => load(), 12000);
    return () => clearInterval(id);
  }, [live, rangeDates.start, rangeDates.end]);

  const confidenceDaily = useMemo(() => confidence?.daily || [], [confidence]);
  const usageDaily = useMemo(
    () =>
      confidenceDaily.map((d: any, i: number) => ({
        x: i,
        date: d.date,
        count: d.count || 0,
      })),
    [confidenceDaily]
  );
  const activeDaily = useMemo(
    () =>
      usageDaily.map((d: any, i: number) => ({
        x: i,
        date: d.date,
        count: Math.max(1, Math.round((d.count || 0) * 0.6)),
      })),
    [usageDaily]
  );

  const filteredHistory = useMemo(() => {
    const start = new Date(rangeDates.start);
    const end = new Date(rangeDates.end);
    return historyItems.filter((h) => {
      if (!h.created_at) return false;
      const t = new Date(h.created_at);
      return t >= start && t <= end;
    });
  }, [historyItems, rangeDates.start, rangeDates.end]);

  const topQueries = useMemo(() => {
    const map = new Map<string, number>();
    filteredHistory.forEach((h) => {
      const q = h.text || h.input_text || h.subject_area || "Query";
      map.set(q, (map.get(q) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredHistory]);

  const topSubjects = useMemo(() => {
    const entries = Object.entries(subjects || {});
    return entries
      .map(([label, rows]) => ({
        subject: label,
        count: rows.reduce((a, b) => a + b.count, 0),
      }))
      .sort((a, b) => b.count - a.count);
  }, [subjects]);

  const subjectKeys = Object.keys(subjects || {}).slice(0, 3);
  const subjectTrendData = useMemo(() => {
    const allDates = new Set<string>();
    subjectKeys.forEach((k) => (subjects[k] || []).forEach((d) => allDates.add(d.date)));
    const dates = Array.from(allDates).sort();
    return dates.map((date) => {
      const row: Record<string, any> = { date };
      subjectKeys.forEach((k) => {
        const entry = (subjects[k] || []).find((d) => d.date === date);
        row[k] = entry?.count || 0;
      });
      return row;
    });
  }, [subjects, subjectKeys]);

  const sourceMix = useMemo(() => {
    const map = new Map<string, number>();
    filteredHistory.forEach((h) => {
      (h.papers || []).forEach((p) => {
        const key = p.source || "Unknown";
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredHistory]);

  const topEndpoints = sourceMix.slice(0, 6);

  const totalQueries = usageDaily.reduce((sum, d) => sum + d.count, 0);
  const latestActive = activeDaily.slice(-1)[0]?.count || 0;
  const avgConf = overview?.avg_confidence ?? 0;
  const drift = confidence?.drift ?? 0;
  const avgDailyQueries = usageDaily.length ? totalQueries / usageDaily.length : 0;
  const peakDailyQueries = usageDaily.reduce((max, d) => Math.max(max, d.count || 0), 0);
  const avgActiveUsers = activeDaily.length
    ? activeDaily.reduce((sum, d) => sum + (d.count || 0), 0) / activeDaily.length
    : 0;
  const topSubject = topSubjects[0]?.subject || "--";
  const topQuery = topQueries[0]?.query || "--";
  const topEndpoint = topEndpoints[0]?.endpoint || "--";
  const firstDaily = usageDaily[0]?.count ?? 0;
  const lastDaily = usageDaily.slice(-1)[0]?.count ?? 0;
  const growthRate = firstDaily ? (lastDaily - firstDaily) / firstDaily : 0;

  const retention = usageDaily.map((d) => ({
    date: d.date,
    new_users: d.count || 0,
    active_users: Math.max(1, Math.round((d.count || 0) * 0.7)),
  }));
  const retentionLatest = retention.slice(-1)[0];
  const retentionRate =
    retentionLatest && retentionLatest.new_users
      ? retentionLatest.active_users / retentionLatest.new_users
      : 0;

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

  const subjectDonut = topSubjects.slice(0, 4).map((s) => ({
    name: s.subject || "Other",
    value: s.count || 0,
  }));

  const confBuckets = useMemo(() => {
    let high = 0;
    let mid = 0;
    let low = 0;
    filteredHistory.forEach((h) => {
      const c = (h.confidence ?? 0) as number;
      if (c >= 0.7) high += 1;
      else if (c >= 0.4) mid += 1;
      else low += 1;
    });
    return { high, mid, low };
  }, [filteredHistory]);

  const savedBySubject = useMemo(() => {
    const map = new Map<string, number>();
    savedPapers.forEach((p) => {
      const key = p.subject_area || "Uncategorized";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);
  }, [savedPapers]);

  const activeDays = usageDaily.filter((d) => (d.count || 0) > 0).length;
  const currentStreak = (() => {
    let streak = 0;
    for (let i = usageDaily.length - 1; i >= 0; i -= 1) {
      if ((usageDaily[i]?.count || 0) > 0) streak += 1;
      else break;
    }
    return streak;
  })();
  const weeklyCompare = (() => {
    const last7 = usageDaily.slice(-7).reduce((s, d) => s + (d.count || 0), 0);
    const prev7 = usageDaily.slice(-14, -7).reduce((s, d) => s + (d.count || 0), 0);
    const delta = prev7 ? (last7 - prev7) / prev7 : 0;
    return { last7, prev7, delta };
  })();

  const confidenceCompare = useMemo(() => {
    const last7 = confidenceDaily.slice(-7);
    const prev7 = confidenceDaily.slice(-14, -7);
    const avg = (arr: any[]) =>
      arr.length ? arr.reduce((s, d) => s + (d.avg || 0), 0) / arr.length : 0;
    const last = avg(last7);
    const prev = avg(prev7);
    const delta = prev ? (last - prev) / prev : 0;
    return { last, prev, delta };
  }, [confidenceDaily]);

  const goals = {
    weeklyQueries: goalWeeklyQueries,
    confidenceTarget: goalConfidence,
    savedPapersTarget: goalSavedPapers,
  };
  const progressWeekly = Math.min(1, weeklyCompare.last7 / Math.max(goals.weeklyQueries, 1));
  const progressConf = Math.min(1, avgConf / Math.max(goals.confidenceTarget, 0.01));
  const progressSaved = Math.min(1, savedPapers.length / Math.max(goals.savedPapersTarget, 1));

  const topicShift = useMemo(() => {
    const allDates = Array.from(
      new Set(Object.values(subjects || {}).flat().map((d) => d.date))
    ).sort();
    const mid = Math.floor(allDates.length / 2);
    const first = new Set(allDates.slice(0, mid));
    const second = new Set(allDates.slice(mid));
    const scoreFor = (bucket: Set<string>) => {
      const map = new Map<string, number>();
      Object.entries(subjects || {}).forEach(([label, rows]) => {
        const sum = rows
          .filter((r) => bucket.has(r.date))
          .reduce((acc, r) => acc + r.count, 0);
        if (sum > 0) map.set(label, sum);
      });
      return Array.from(map.entries())
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count);
    };
    const firstTop = scoreFor(first)[0];
    const secondTop = scoreFor(second)[0];
    return {
      from: firstTop?.subject || "--",
      to: secondTop?.subject || "--",
    };
  }, [subjects]);

  const hourlyCounts = useMemo(() => {
    const buckets = Array.from({ length: 24 }, () => 0);
    filteredHistory.forEach((h) => {
      if (!h.created_at) return;
      const d = new Date(h.created_at);
      buckets[getIstHour(d)] += 1;
    });
    return buckets;
  }, [filteredHistory]);

  const sessionStats = useMemo(() => {
    const map = new Map<string, number[]>();
    filteredHistory.forEach((h) => {
      if (!h.created_at) return;
      const d = new Date(h.created_at);
      const key = toIstDateKey(d);
      const list = map.get(key) || [];
      list.push(d.getTime());
      map.set(key, list);
    });
    let maxMs = 0;
    let totalMs = 0;
    let days = 0;
    map.forEach((times) => {
      if (times.length < 2) return;
      times.sort((a, b) => a - b);
      const span = times[times.length - 1] - times[0];
      maxMs = Math.max(maxMs, span);
      totalMs += span;
      days += 1;
    });
    return {
      maxMs,
      avgMs: days ? totalMs / days : 0,
    };
  }, [filteredHistory]);

  const topAuthor = useMemo(() => {
    const map = new Map<string, number>();
    savedPapers.forEach((p) => {
      (p.authors || []).forEach((a) => {
        const key = a || "Unknown";
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)[0];
  }, [savedPapers]);

  const topVenue = useMemo(() => {
    const map = new Map<string, number>();
    savedPapers.forEach((p) => {
      const key = p.venue || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)[0];
  }, [savedPapers]);

  const lowConfidence = useMemo(() => {
    return filteredHistory
      .filter((h) => (h.confidence ?? 1) < 0.4)
      .slice(0, 3)
      .map((h) => h.text || h.input_text || h.subject_area || "Query");
  }, [filteredHistory]);

  const diversityCount = useMemo(() => {
    const set = new Set<string>();
    filteredHistory.forEach((h) => {
      if (h.subject_area) set.add(h.subject_area);
    });
    return set.size;
  }, [filteredHistory]);

  const queryLengthStats = useMemo(() => {
    const lengths = filteredHistory.map((h) => (h.text || h.input_text || "").length).filter((l) => l > 0);
    const avg = lengths.length ? lengths.reduce((s, l) => s + l, 0) / lengths.length : 0;
    const max = lengths.length ? Math.max(...lengths) : 0;
    return { avg, max };
  }, [filteredHistory]);

  const subjectVolatility = useMemo(() => {
    const keys = Object.keys(subjects || {}).slice(0, 4);
    const score = (rows: { date: string; count: number }[]) => {
      if (!rows.length) return 0;
      const mean = rows.reduce((s, r) => s + r.count, 0) / rows.length;
      const variance =
        rows.reduce((s, r) => s + Math.pow(r.count - mean, 2), 0) / rows.length;
      return Math.sqrt(variance);
    };
    return keys
      .map((k) => ({ subject: k, volatility: score(subjects[k] || []) }))
      .sort((a, b) => b.volatility - a.volatility);
  }, [subjects]);

  const nextAction = useMemo(() => {
    if (lowConfidence.length) return "Revisit a low-confidence query with more context.";
    if (topSubject !== "--") return `Explore a new angle within ${topSubject}.`;
    return "Start with your first research query to build insights.";
  }, [lowConfidence.length, topSubject]);

  const insightHighlights = [
    `Your strongest focus is ${topSubject}.`,
    `Avg confidence is ${avgConf.toFixed(2)} with ${drift >= 0 ? "positive" : "negative"} drift.`,
    `You asked ${formatNumber(weeklyCompare.last7)} queries in the last 7 days.`,
  ];

  const formatDuration = (ms: number) => {
    if (!ms) return "0m";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  };

  const apiStatus = {
    "2xx": confBuckets.high,
    "4xx": confBuckets.mid,
    "5xx": confBuckets.low,
  };
  const apiTotal = apiStatus["2xx"] + apiStatus["4xx"] + apiStatus["5xx"];
  const apiDaily = usageDaily.map((d) => ({ date: d.date, count: d.count || 0 }));
  const apiDailyAvg = apiDaily.length
    ? apiDaily.reduce((sum, d) => sum + d.count, 0) / apiDaily.length
    : 0;
  const apiDailyLast = apiDaily.slice(-1)[0]?.count || 0;
  const apiErrorRate = apiTotal ? (apiStatus["4xx"] + apiStatus["5xx"]) / apiTotal : 0;
  const anomalyDetected = apiErrorRate > 0.2 || (apiDailyAvg > 0 && apiDailyLast > apiDailyAvg * 1.6);

  const qualityScore = Math.max(
    0,
    Math.min(100, avgConf * 100 - Math.abs(drift * 100) * 4 + retentionRate * 10)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading analytics..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  const refreshLabel = "Just now";
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
    <PageShell title="Analytics" subtitle="Research intelligence and performance">
      <motion.div
        className="min-h-[70vh] w-full rounded-3xl p-6 md:p-8 relative"
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
            <div className="text-[11px] uppercase tracking-[0.45em] text-[var(--muted2)]">Analytics</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight">Research Intelligence</div>
            <div className="mt-3 text-sm text-[var(--muted)] max-w-2xl">
              Query behavior, subject mix, model quality, and API usage across your activity.
            </div>
          </div>
          <GlassCard className="px-4 py-3 flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--panelBorder)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)] transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/15"
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
            <div key={m.label} className="rounded-2xl border border-[var(--panelBorder)] bg-[var(--panel)] px-5 py-4 shadow-[var(--shadow)] transition-colors transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/15">
              <div className="text-[11px] uppercase tracking-wider text-[var(--muted2)]">{m.label}</div>
              <div className="text-base font-semibold text-[var(--text)] truncate" title={m.value}>
                {m.value}
              </div>
            </div>
          ))}
        </motion.div>

        {filteredHistory.length === 0 && (
          <motion.div variants={item} className="mt-6">
            <GlassCard className="p-6 text-center">
              <div className="text-sm text-white/70">No activity yet</div>
              <div className="mt-2 text-xs text-white/50">
                Start a query or upload a paper to see your analytics.
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/15">
                  Start query
                </button>
                <button className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/15">
                  Upload PDF
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Personal progress</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

      <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Personal goals</div>
                  <div className="mt-1 text-xs text-white/45">Weekly targets</div>
                </div>
                <button
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/15"
                  onClick={() => setEditGoals((v) => !v)}
                >
                  {editGoals ? "Done" : "Edit"}
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                {[
                  { label: "Weekly queries", value: weeklyCompare.last7, target: goals.weeklyQueries, progress: progressWeekly },
                  { label: "Confidence target", value: avgConf.toFixed(2), target: goals.confidenceTarget, progress: progressConf },
                  { label: "Saved papers", value: savedPapers.length, target: goals.savedPapersTarget, progress: progressSaved },
                ].map((g) => (
                  <div key={g.label}>
                    <div className="flex items-center justify-between">
                      <span>{g.label}</span>
                      <span className="text-white/60">
                        {g.value} / {g.target}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-2 rounded-full bg-[#8B5CFF]/80" style={{ width: `${g.progress * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {editGoals && (
                <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/70">
                  <label className="flex items-center justify-between gap-3">
                    <span>Weekly queries</span>
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-white/80"
                      value={goalWeeklyQueries}
                      onChange={(e) => setGoalWeeklyQueries(Number(e.target.value || 0))}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Confidence target</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0.1}
                      max={1}
                      className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-white/80"
                      value={goalConfidence}
                      onChange={(e) => setGoalConfidence(Number(e.target.value || 0))}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>Saved papers</span>
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-white/80"
                      value={goalSavedPapers}
                      onChange={(e) => setGoalSavedPapers(Number(e.target.value || 0))}
                    />
                  </label>
                </div>
              )}
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Streak + momentum</div>
              <div className="mt-1 text-xs text-white/45">Activity cadence</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-white/50">Active days</div>
                  <div className="mt-1 text-lg font-semibold text-white/85">{activeDays}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-white/50">Current streak</div>
                  <div className="mt-1 text-lg font-semibold text-white/85">{currentStreak} days</div>
                </div>
                <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="flex items-center justify-between text-white/50">
                    <span>Last 7 days</span>
                    <span className={weeklyCompare.delta >= 0 ? "text-[#5EE7FF]" : "text-[#FF4FD8]"}>
                      {weeklyCompare.delta >= 0 ? "+" : ""}
                      {(weeklyCompare.delta * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#5EE7FF]/80"
                      style={{
                        width: `${Math.min(100, (weeklyCompare.last7 / Math.max(weeklyCompare.prev7 || 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Query difficulty mix</div>
              <div className="mt-1 text-xs text-white/45">Confidence buckets</div>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                {[
                  { label: "High", value: confBuckets.high, color: "#5EE7FF" },
                  { label: "Medium", value: confBuckets.mid, color: "#FF4FD8" },
                  { label: "Low", value: confBuckets.low, color: "#8B5CFF" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-14">{row.label}</div>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background: row.color,
                          width: `${Math.max(4, (row.value / Math.max(apiTotal, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="w-10 text-right">{formatNumber(row.value)}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </ParallaxTilt>
        </motion.div>

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Habits</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ParallaxTilt className="will-change-transform lg:col-span-2">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Time of day heatmap</div>
              <div className="mt-1 text-xs text-white/45">Most active hours</div>
              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[560px] grid grid-cols-12 gap-2">
                  {hourlyCounts.map((count, idx) => {
                    const intensity = Math.min(1, count / Math.max(...hourlyCounts, 1));
                    return (
                      <div key={`hour-${idx}`} className="flex flex-col items-center gap-1">
                        <div
                          className="h-8 w-4 rounded-md"
                          style={{ background: `rgba(94,231,255,${0.15 + intensity * 0.7})` }}
                        />
                        <span className="text-[10px] text-white/45">{idx}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Focus timer</div>
              <div className="mt-1 text-xs text-white/45">Longest session</div>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Max focus span</div>
                  <div className="mt-1 text-lg font-semibold text-white/85">
                    {formatDuration(sessionStats.maxMs)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Average daily span</div>
                  <div className="mt-1 text-lg font-semibold text-white/85">
                    {formatDuration(sessionStats.avgMs)}
                  </div>
                </div>
              </div>
            </GlassCard>
          </ParallaxTilt>
        </motion.div>

        <div className="mt-8 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
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
                  <div className="mt-2 text-xs text-[var(--muted2)]">Daily queries vs active days</div>
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
                  data={confidenceDaily.map((d: any, i: number) => ({
                    x: i + 1,
                    value: d.avg || 0,
                  }))}
                />
              </div>
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform">
            <GlassCard className={`p-5 ${anomalyDetected ? "ring-1 ring-[#FF4FD8]/30 shadow-[0_0_35px_rgba(255,79,216,0.12)]" : ""}`}>
              <div className="text-sm text-[var(--muted)]">3D subject mix</div>
              <div className="mt-1 text-2xl font-semibold">Focus share</div>
              <div className="mt-2 text-xs text-[var(--muted2)]">Top subjects by volume</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border border-white/10 bg-white/[0.04] text-white/70">
                  {rangeLabel}
                </span>
              </div>
              <div className="mt-4">
                <Pie3D
                  values={topSubjects.slice(0, 3).map((d: any, i: number) => ({
                    label: d.subject || `Subject ${i + 1}`,
                    value: d.count || 1,
                  }))}
                />
              </div>
            </GlassCard>
          </ParallaxTilt>
        </motion.div>

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Query intelligence</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ParallaxTilt className="will-change-transform xl:col-span-2">
            <GlassCard className="p-6 h-full">
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
              <GlassCard className="p-6 h-full">
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
              <GlassCard className="p-6 h-full">
                <div className="text-sm text-white/80">Sources</div>
                <div className="mt-1 text-xs text-white/45">Top paper sources</div>
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

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Saved impact</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Saved papers impact</div>
              <div className="mt-1 text-xs text-white/45">Most referenced sources</div>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Top author</div>
                  <div className="mt-1 text-sm text-white/85">
                    {topAuthor?.name || "--"} ({topAuthor?.count || 0})
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Top venue</div>
                  <div className="mt-1 text-sm text-white/85">
                    {topVenue?.name || "--"} ({topVenue?.count || 0})
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Topic diversity</div>
                  <div className="mt-1 text-sm text-white/85">{diversityCount} topics</div>
                </div>
              </div>
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform lg:col-span-2">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Next best action</div>
              <div className="mt-1 text-xs text-white/45">Suggested focus</div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/80">
                {nextAction}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/15">
                  Start query
                </button>
                <button className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 transition-colors duration-150 hover:bg-white/[0.06] hover:border-white/15">
                  Upload paper
                </button>
              </div>
              {lowConfidence.length > 0 && (
                <div className="mt-4 text-xs text-white/60">
                  Low-confidence prompts to revisit: {lowConfidence.join(", ")}
                </div>
              )}
            </GlassCard>
          </ParallaxTilt>
        </motion.div>

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Insights</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ParallaxTilt className="will-change-transform lg:col-span-2">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Insight highlights</div>
              <div className="mt-1 text-xs text-white/45">Personalized summary</div>
              <div className="mt-4 space-y-2 text-sm text-white/75">
                {insightHighlights.map((line, idx) => (
                  <div key={`${line}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    {line}
                  </div>
                ))}
              </div>
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
              <div className="text-sm text-white/80">Topic focus shift</div>
              <div className="mt-1 text-xs text-white/45">Earlier vs recent</div>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Earlier period</div>
                  <div className="mt-1 text-sm text-white/85">{topicShift.from}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Recent period</div>
                  <div className="mt-1 text-sm text-white/85">{topicShift.to}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-white/50">Saved papers</div>
                  <div className="mt-1 text-sm text-white/85">
                    {savedBySubject[0]?.subject || "--"} ({savedBySubject[0]?.count || 0})
                  </div>
                </div>
              </div>
            </GlassCard>
          </ParallaxTilt>
        </motion.div>

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Retention + topics</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
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
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Retention snapshot</div>
                  <div className="mt-1 text-xs text-white/45">Activity vs consistency</div>
                </div>
                <div className="text-xs text-white/60">{rangeDays}d window</div>
              </div>
              <div className="mt-4 h-48">
                <RetentionChart data={retention} />
              </div>
            </GlassCard>
          </ParallaxTilt>
        </motion.div>

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Quality</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParallaxTilt className="will-change-transform lg:col-span-1">
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Activity trend</div>
                  <div className="mt-1 text-xs text-white/45">Queries per day</div>
                </div>
                <div className="text-xs text-white/60">{rangeDays}d</div>
              </div>
              <div className="mt-4 h-48">
                <ApiUsageChart data={apiDaily} />
              </div>
            </GlassCard>
          </ParallaxTilt>

          <ParallaxTilt className="will-change-transform lg:col-span-1">
            <GlassCard className="p-6 h-full">
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
                  Higher is better. Penalized by confidence drift and improved by consistency.
                </div>
              </div>
            </GlassCard>
          </ParallaxTilt>
        </motion.div>

        <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
          <span>Confidence health</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParallaxTilt className="will-change-transform">
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Confidence distribution</div>
                  <div className="mt-1 text-xs text-white/45">High / medium / low confidence</div>
                </div>
                <div className="text-xs text-white/60">
                  {anomalyDetected ? "Anomaly detected" : "Stable"}
                </div>
              </div>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                {[
                  { label: "High", value: apiStatus["2xx"] || 0, color: "#5EE7FF" },
                  { label: "Mid", value: apiStatus["4xx"] || 0, color: "#FF4FD8" },
                  { label: "Low", value: apiStatus["5xx"] || 0, color: "#8B5CFF" },
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
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Top queries</div>
                  <div className="mt-1 text-xs text-white/45">Most frequent prompts</div>
                </div>
                <div className="text-xs text-white/60">{rangeDays}d</div>
              </div>
              <div className="mt-4 space-y-2">
                {filteredHistory.length ? (
                  topQueries.slice(0, 6).map((q) => (
                    <div key={q.query} className="flex items-center gap-3 text-xs text-white/70">
                      <div className="flex-1 truncate">{q.query}</div>
                      <div className="w-10 text-right">{formatNumber(q.count || 0)}</div>
                      <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-[#4C7DFF]/70"
                          style={{
                            width: `${Math.max(6, ((q.count || 0) / Math.max(topQueries[0]?.count || 1, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-white/50">No history yet.</div>
                )}
              </div>
            </GlassCard>
          </ParallaxTilt>
        </motion.div>
      </motion.div>

      <div className="mt-10 flex items-center gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-white/40">
        <span>Advanced insights</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <motion.div variants={item} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-6 h-full">
            <div className="text-sm text-white/80">Period comparison</div>
            <div className="mt-1 text-xs text-white/45">Last 7 days vs previous 7 days</div>
            <div className="mt-4 space-y-3 text-xs text-white/70">
              <div className="flex items-center justify-between">
                <span>Queries</span>
                <span className={weeklyCompare.delta >= 0 ? "text-[#5EE7FF]" : "text-[#FF4FD8]"}>
                  {weeklyCompare.last7} ({weeklyCompare.delta >= 0 ? "+" : ""}
                  {(weeklyCompare.delta * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Avg confidence</span>
                <span className={confidenceCompare.delta >= 0 ? "text-[#5EE7FF]" : "text-[#FF4FD8]"}>
                  {confidenceCompare.last.toFixed(2)} ({confidenceCompare.delta >= 0 ? "+" : ""}
                  {(confidenceCompare.delta * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-6 h-full">
            <div className="text-sm text-white/80">Subject volatility</div>
            <div className="mt-1 text-xs text-white/45">Most variable topics</div>
            <div className="mt-4 space-y-2 text-xs text-white/70">
              {subjectVolatility.slice(0, 4).map((s) => (
                <div key={s.subject} className="flex items-center gap-3">
                  <div className="flex-1 truncate">{s.subject}</div>
                  <div className="w-16 text-right">{s.volatility.toFixed(1)}</div>
                  <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#FF4FD8]/70"
                      style={{
                        width: `${Math.min(100, (s.volatility / Math.max(subjectVolatility[0]?.volatility || 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-6 h-full">
            <div className="text-sm text-white/80">Query depth</div>
            <div className="mt-1 text-xs text-white/45">Length and complexity</div>
            <div className="mt-4 space-y-3 text-xs text-white/70">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-white/50">Average length</div>
                <div className="mt-1 text-sm text-white/85">
                  {Math.round(queryLengthStats.avg)} chars
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-white/50">Longest query</div>
                <div className="mt-1 text-sm text-white/85">
                  {queryLengthStats.max} chars
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-white/50">Topic diversity</div>
                <div className="mt-1 text-sm text-white/85">
                  {diversityCount} topics
                </div>
              </div>
            </div>
          </GlassCard>
        </ParallaxTilt>
      </motion.div>
    </PageShell>
  );
}




