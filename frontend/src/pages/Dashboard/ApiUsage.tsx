import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import BarChart from "../../components/analytics/BarChart";
import { apiAnalyticsApiUsage } from "../../api/analytics.api";
import { getErrorMessage } from "../../utils/errors";

export default function ApiUsage() {
  const [endpoints, setEndpoints] = useState<{ label: string; value: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiAnalyticsApiUsage();
        setEndpoints(
          (res.endpoints || []).map((e) => ({
            label: e.endpoint.replace("/", "").slice(0, 6) || "API",
            value: e.count,
          }))
        );
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load API usage."));
      }
    };
    run();
  }, []);

  return (
    <PageShell title="API Usage" subtitle="Token and endpoint analytics">
      <div className="grid gap-4 md:grid-cols-3">
        {["Tokens", "Requests", "Limits"].map((k) => (
          <div key={k} className="glass rounded-2xl p-5 border border-white/10">
            <div className="text-xs text-white/50">{k}</div>
            <div className="mt-3 text-3xl font-black">
              {k === "Tokens" ? "1.2M" : k === "Requests" ? "3,428" : "80%"}
            </div>
            <div className="text-xs text-white/50 mt-2">Last 30 days</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <BarChart
          title="Endpoint Usage"
          data={endpoints.length ? endpoints : [{ label: "API", value: 1 }]}
        />
        <div className="glass rounded-2xl p-6 border border-white/10">
          <div className="text-sm font-semibold">Rate Limits</div>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span>Requests / min</span>
              <span>60</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Summary / min</span>
              <span>20</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Chat / min</span>
              <span>40</span>
            </div>
          </div>
        </div>
      </div>
      {error && <div className="mt-3 text-xs text-red-300">{error}</div>}
    </PageShell>
  );
}
