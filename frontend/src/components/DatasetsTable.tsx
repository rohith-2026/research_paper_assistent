import React from "react";
import clsx from "clsx";
import GlassCard from "./GlassCard";
import { Sparkline } from "./Charts";

type DatasetRow = {
  name: string;
  owner: string;
  status: "Active" | "Paused" | "Draft";
  updated: string;
  size: string;
  queries: string;
  spark: { x: number; y: number }[];
};

const StatusPill = ({ value }: { value: DatasetRow["status"] }) => {
  const styles =
    value === "Active"
      ? "bg-white/10 text-white"
      : value === "Paused"
      ? "bg-white/5 text-white/70"
      : "bg-white/5 text-white/50";
  return (
    <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs", styles)}>
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
      {value}
    </span>
  );
};

const Mono = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-[12px] tracking-wide text-white/80">{children}</span>
);

export default function DatasetsTable({ rows }: { rows: DatasetRow[] }) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-sm text-white/80">Datasets</div>
          <div className="mt-1 text-xs text-white/45">Overview of datasets and activity</div>
        </div>
        <button className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 hover:bg-white/[0.06]">
          Export
        </button>
      </div>

      <div className="grid grid-cols-12 gap-0 px-5 py-3 text-[11px] uppercase tracking-wider text-white/40">
        <div className="col-span-4">Name</div>
        <div className="col-span-2">Owner</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Updated</div>
        <div className="col-span-1 text-right">Size</div>
        <div className="col-span-1 text-right">Trend</div>
      </div>

      <div className="divide-y divide-white/10">
        {rows.map((r) => (
          <div
            key={r.name}
            className="grid grid-cols-12 items-center px-5 py-4 transition hover:bg-white/[0.03]"
          >
            <div className="col-span-4">
              <div className="text-sm text-white/85">{r.name}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-white/45">
                <span>
                  Queries: <Mono>{r.queries}</Mono>
                </span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span>Region: Global</span>
              </div>
            </div>
            <div className="col-span-2 text-sm text-white/70">{r.owner}</div>
            <div className="col-span-2">
              <StatusPill value={r.status} />
            </div>
            <div className="col-span-2 text-sm text-white/60">{r.updated}</div>
            <div className="col-span-1 text-right text-sm text-white/70">{r.size}</div>
            <div className="col-span-1 h-10">
              <Sparkline data={r.spark} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
