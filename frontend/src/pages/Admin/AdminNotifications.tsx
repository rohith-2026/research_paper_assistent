import { useMemo, useState } from "react";
import clsx from "clsx";
import Card from "../../components/ui/Card";

type Notice = {
  id: string;
  type: "alert" | "escalation" | "system";
  title: string;
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
  source: string;
  created_at: string;
  owner?: string;
};

const notices: Notice[] = [
  {
    id: "ntf-001",
    type: "alert",
    title: "API error spike detected",
    detail: "4xx/5xx rate breached 5% threshold on /chat/message.",
    severity: "high",
    status: "investigating",
    source: "API Gateway",
    created_at: "2026-02-08T13:22:00Z",
    owner: "On-call",
  },
  {
    id: "ntf-002",
    type: "escalation",
    title: "Abuse flag escalation",
    detail: "3 critical flags opened in 15 minutes. Review required.",
    severity: "critical",
    status: "open",
    source: "Abuse Engine",
    created_at: "2026-02-08T12:58:00Z",
  },
  {
    id: "ntf-003",
    type: "system",
    title: "Search index rebuild completed",
    detail: "Index refresh succeeded. 2.4M docs reindexed.",
    severity: "low",
    status: "resolved",
    source: "System",
    created_at: "2026-02-08T12:40:00Z",
  },
  {
    id: "ntf-004",
    type: "alert",
    title: "Latency regression",
    detail: "p95 latency increased by 18% in the last 30 minutes.",
    severity: "medium",
    status: "open",
    source: "Telemetry",
    created_at: "2026-02-08T12:10:00Z",
  },
  {
    id: "ntf-005",
    type: "system",
    title: "Model registry updated",
    detail: "New version deployed for summarization model.",
    severity: "low",
    status: "resolved",
    source: "Model Ops",
    created_at: "2026-02-08T11:48:00Z",
  },
  {
    id: "ntf-006",
    type: "escalation",
    title: "Data retention exception",
    detail: "Purge job exceeded SLA by 2 hours.",
    severity: "high",
    status: "investigating",
    source: "Compliance",
    created_at: "2026-02-08T10:36:00Z",
  },
];

const filters = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "escalation", label: "Escalations" },
  { key: "system", label: "System" },
];

const badge = (severity: Notice["severity"]) => {
  if (severity === "critical") return "border-red-400/40 bg-red-500/10 text-red-200";
  if (severity === "high") return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  if (severity === "medium") return "border-cyan-400/40 bg-cyan-500/10 text-cyan-200";
  return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
};

export default function AdminNotifications() {
  const [active, setActive] = useState("all");

  const items = useMemo(() => {
    if (active === "all") return notices;
    return notices.filter((n) => n.type === active);
  }, [active]);

  const counts = useMemo(
    () => ({
      total: notices.length,
      open: notices.filter((n) => n.status !== "resolved").length,
      critical: notices.filter((n) => n.severity === "critical").length,
      escalations: notices.filter((n) => n.type === "escalation").length,
    }),
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
          <h1 className="text-3xl font-black text-white/95">Notifications</h1>
          <p className="text-sm text-white/60 mt-2 max-w-2xl">
            Prioritize incidents, track escalations, and close the loop on system changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">Open {counts.open}</span>
          <span className="chip chip-accent">Critical {counts.critical}</span>
          <span className="chip">Escalations {counts.escalations}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total items", value: counts.total },
          { label: "Open", value: counts.open },
          { label: "Critical", value: counts.critical },
          { label: "Escalations", value: counts.escalations },
        ].map((card) => (
          <Card key={card.label}>
            <div className="text-[11px] uppercase tracking-wider text-white/40">{card.label}</div>
            <div className="text-2xl font-semibold text-white/90 mt-2">{card.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs border",
              active === f.key
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white"
            )}
            onClick={() => setActive(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white/80">Inbox</div>
              <div className="text-xs text-white/45 mt-1">Recent notifications and escalations</div>
            </div>
            <button className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60">
              Mark all read
            </button>
          </div>
          <div className="mt-4 divide-y divide-white/5">
            {items.map((n) => (
              <div key={n.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40">{n.type}</div>
                    <div className="text-sm text-white/85 mt-1">{n.title}</div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] border ${badge(
                      n.severity
                    )}`}
                  >
                    {n.severity}
                  </span>
                </div>
                <div className="text-xs text-white/55 mt-2">{n.detail}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                  <span>Status: {n.status}</span>
                  <span>Source: {n.source}</span>
                  <span>Owner: {n.owner || "Unassigned"}</span>
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="text-sm font-semibold text-white/80">Escalation workflow</div>
            <div className="text-xs text-white/45 mt-1">Current queue health</div>
            <div className="mt-4 space-y-3 text-xs text-white/70">
              {[
                { label: "Pending review", value: 6 },
                { label: "In progress", value: 3 },
                { label: "Resolved today", value: 12 },
                { label: "SLA breaches", value: 1 },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <span className="text-white/90">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-white/80">System pulse</div>
            <div className="text-xs text-white/45 mt-1">Status signals</div>
            <div className="mt-4 space-y-3">
              {[
                { label: "API gateway", status: "Stable" },
                { label: "Model inference", status: "Stable" },
                { label: "Queue latency", status: "Elevated" },
                { label: "Compliance jobs", status: "Stable" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs text-white/70">
                  <span>{row.label}</span>
                  <span className={row.status === "Elevated" ? "text-red-300" : "text-emerald-300"}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
