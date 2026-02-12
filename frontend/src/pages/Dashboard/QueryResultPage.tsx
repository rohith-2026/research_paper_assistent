import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import QueryResult from "../../components/assistant/QueryResult";
import { apiHistory, HistoryItem, QueryResponse } from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";

export default function QueryResultPage() {
  const [params] = useSearchParams();
  const historyId = params.get("history_id");
  const [data, setData] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiHistory(50, 0);
        const items = res.items || [];
        const item = historyId
          ? items.find((i: HistoryItem) => i.id === historyId)
          : items[0];
        if (!item) {
          setError("No query history found.");
          return;
        }
        setData({
          subject_area: item.subject_area || "Unknown",
          model_confidence: item.confidence || 0,
          top_predictions: item.top_predictions || item.predicted_topics || [],
          top_papers: item.papers || [],
          gpt_answer: item.gpt_answer || null,
        });
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load query result."));
      }
    };
    run();
  }, [historyId]);

  return (
    <PageShell title="Query Result" subtitle="Single query output and actions">
      {data && <QueryResult data={data} />}
      {!data && !error && (
        <div className="glass rounded-2xl p-6 text-white/60">
          Loading query result...
        </div>
      )}
      {error && <div className="text-red-300 text-sm">{error}</div>}
    </PageShell>
  );
}
