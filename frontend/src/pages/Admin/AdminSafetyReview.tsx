import { useMemo, useState } from "react";
import clsx from "clsx";
import Card from "../../components/ui/Card";

type ReviewItem = {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  content: string;
  source: string;
  status: "queued" | "in_review" | "resolved";
  flagged_at: string;
  assignee?: string;
};

const queue: ReviewItem[] = [
  {
    id: "sr-001",
    severity: "critical",
    reason: "PII leak",
    content: "User asked to include a phone number in the summary.",
    source: "Chat / Summarize",
    status: "queued",
    flagged_at: "2026-02-08T13:40:00Z",
  },
  {
    id: "sr-002",
    severity: "high",
    reason: "Hate or harassment",
    content: "Response contains targeted harassment language.",
    source: "Chat / Q&A",
    status: "in_review",
    flagged_at: "2026-02-08T12:20:00Z",
    assignee: "Reviewer A",
  },
  {
    id: "sr-003",
    severity: "medium",
    reason: "Medical advice",
    content: "User requested diagnosis without professional disclaimer.",
    source: "Chat / Q&A",
    status: "queued",
    flagged_at: "2026-02-08T11:58:00Z",
  },
  {
    id: "sr-004",
    severity: "low",
    reason: "Prompt injection",
    content: "Attempt to access system prompt.",
    source: "Chat / Research",
    status: "resolved",
    flagged_at: "2026-02-08T10:50:00Z",
    assignee: "Reviewer B",
  },
  {
    id: "sr-005",
    severity: "high",
    reason: "Self-harm",
    content: "User expressed intent to self-harm.",
    source: "Chat / General",
    status: "queued",
    flagged_at: "2026-02-08T10:05:00Z",
  },
];

const severityBadge = (sev: ReviewItem["severity"]) => {
  if (sev === "critical") return "border-red-400/40 bg-red-500/10 text-red-200";
  if (sev === "high") return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  if (sev === "medium") return "border-cyan-400/40 bg-cyan-500/10 text-cyan-200";
  return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
};

const tabs = ["all", "queued", "in_review", "resolved"] as const;

export default function AdminSafetyReview() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");

  const items = useMemo(() => {
    if (tab === "all") return queue;
    return queue.filter((q) => q.status === tab);
  }, [tab]);

  const stats = useMemo(
    () => ({
      total: queue.length,
      queued: queue.filter((q) => q.status === "queued").length,
      in_review: queue.filter((q) => q.status === "in_review").length,
      resolved: queue.filter((q) => q.status === "resolved").length,
    }),
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
          <h1 className="text-3xl font-black text-white/95">Safety Review</h1>
          <p className="text-sm text-white/60 mt-2 max-w-2xl">
            Review flagged outputs, track severity, and apply safety actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">Queued {stats.queued}</span>
          <span className="chip chip-accent">In review {stats.in_review}</span>
          <span className="chip">Resolved {stats.resolved}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total flags", value: stats.total },
          { label: "Queued", value: stats.queued },
          { label: "In review", value: stats.in_review },
          { label: "Resolved", value: stats.resolved },
        ].map((card) => (
          <Card key={card.label}>
            <div className="text-[11px] uppercase tracking-wider text-white/40">{card.label}</div>
            <div className="text-2xl font-semibold text-white/90 mt-2">{card.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs border",
              tab === t
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white"
            )}
            onClick={() => setTab(t)}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white/80">Review queue</div>
              <div className="text-xs text-white/45 mt-1">Latest flagged items</div>
            </div>
            <button className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/60">
              Auto-assign
            </button>
          </div>
          <div className="mt-4 divide-y divide-white/5">
            {items.map((q) => (
              <div key={q.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40">{q.reason}</div>
                    <div className="text-sm text-white/85 mt-1">{q.content}</div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] border ${severityBadge(
                      q.severity
                    )}`}
                  >
                    {q.severity}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                  <span>Status: {q.status}</span>
                  <span>Source: {q.source}</span>
                  <span>Assignee: {q.assignee || "Unassigned"}</span>
                  <span>{new Date(q.flagged_at).toLocaleString()}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <button className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/70">
                    Review
                  </button>
                  <button className="px-3 py-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200">
                    Approve
                  </button>
                  <button className="px-3 py-1.5 rounded-full border border-red-400/40 bg-red-500/10 text-red-200">
                    Remove
                  </button>
                  <button className="px-3 py-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-200">
                    Escalate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="text-sm font-semibold text-white/80">Reviewer workload</div>
            <div className="text-xs text-white/45 mt-1">Assignments today</div>
            <div className="mt-4 space-y-3 text-xs text-white/70">
              {[
                { label: "Reviewer A", value: 5 },
                { label: "Reviewer B", value: 3 },
                { label: "Reviewer C", value: 4 },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <span className="text-white/90">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-white/80">Policy checks</div>
            <div className="text-xs text-white/45 mt-1">Automated guardrails</div>
            <div className="mt-4 space-y-3 text-xs text-white/70">
              {[
                { label: "PII redaction", status: "Active" },
                { label: "Harassment filter", status: "Active" },
                { label: "Self-harm protocol", status: "Active" },
                { label: "Medical disclaimer", status: "Active" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <span className="text-emerald-300">{row.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
