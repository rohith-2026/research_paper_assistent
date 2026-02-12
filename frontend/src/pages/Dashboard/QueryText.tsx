import { useEffect, useMemo, useState } from "react";
import { Send, X } from "lucide-react";

import { apiQueryText, QueryResponse, apiHistory } from "../../api/assistant.api";
import QueryResult from "../../components/assistant/QueryResult";
import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import VoiceButton from "../../components/ui/VoiceButton";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";

export default function QueryText() {
  const DRAFT_KEY = "rpa_query_text_draft";
  const LAST_RESULT_KEY = "rpa_query_text_last_result";
  const LAST_RESULT_PREV_KEY = "rpa_query_text_last_result_prev";
  const MAX_LEN = 20000;
  const WARN_LEN = 18000;
  const suggestions = [
    "Summarize recent advances in graph neural networks for citation recommendation.",
    "What are the key challenges in large language model alignment?",
    "Survey of federated learning in healthcare: privacy, security, and performance.",
    "Explain diffusion models for image generation and their evaluation metrics.",
  ];

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QueryResponse | null>(null);
  const [prevData, setPrevData] = useState<QueryResponse | null>(null);
  const [touched, setTouched] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [recentQueries, setRecentQueries] = useState<
    { label: string; value: string; disabled?: boolean }[]
  >([]);
  const [mode, setMode] = useState<"question" | "full_text">("question");
  const [splitView, setSplitView] = useState(true);

  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) setText(draft);
      const last = localStorage.getItem(LAST_RESULT_KEY);
      if (last) setData(JSON.parse(last));
      const prev = localStorage.getItem(LAST_RESULT_PREV_KEY);
      if (prev) setPrevData(JSON.parse(prev));
      const savedAt = localStorage.getItem(`${DRAFT_KEY}_saved_at`);
      if (savedAt) setLastSavedAt(Number(savedAt));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, text);
      localStorage.setItem(`${DRAFT_KEY}_saved_at`, String(Date.now()));
      setLastSavedAt(Date.now());
    } catch {
      // ignore
    }
  }, [text]);

  useEffect(() => {
    if (!data) return;
    try {
      if (data && JSON.stringify(data) !== JSON.stringify(prevData)) {
        localStorage.setItem(LAST_RESULT_PREV_KEY, JSON.stringify(data));
        setPrevData(data);
      }
      localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiHistory(10, 0);
        const items = res.items || [];
        const list = items
          .map((i) => {
            const isFile = i.input_type === "file";
            const subject =
              i.subject_area || i.predicted_topics?.[0]?.label || "Unknown";
            if (isFile) {
              return {
                label: `File upload — ${subject}`,
                value: "",
                disabled: true,
              };
            }
            const val = (i.text || i.input_text || "").trim();
            const label = val ? val.slice(0, 80) : `Text query — ${subject}`;
            return { label, value: val };
          })
          .filter((i) => i.label)
          .slice(0, 6);
        setRecentQueries(list);
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!touched) return;
    const id = window.setTimeout(() => {
      if (text.trim().length > 0 && text.trim().length < 3) {
        setError("Please enter at least 3 characters");
      } else {
        setError(null);
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [text, touched]);

  const charCount = text.length;
  const overLimit = charCount > MAX_LEN;
  const nearLimit = charCount >= WARN_LEN && !overLimit;

  const wordCount = useMemo(() => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [text]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const cleanedText = useMemo(() => {
    return text
      .replace(/\r/g, "")
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, [text]);

  const handleSubmit = async () => {
    if (text.trim().length < 3) {
      setError("Please enter at least 3 characters");
      return;
    }
    if (overLimit) {
      setError(`Text is too long. Max ${MAX_LEN} characters.`);
      return;
    }

    setError(null);
    if (data) setPrevData(data);
    setData(null);

    try {
      setLoading(true);
      const res = await apiQueryText(cleanedText);
      setData(res);
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Query failed. Try again.");
      if (msg.toLowerCase().includes("unauthorized")) {
        setError("Session expired. Please log in again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateText = (next: string) => {
    setText(next);
    setTouched(true);
  };

  const handleClear = () => {
    setText("");
    setData(null);
    setError(null);
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(`${DRAFT_KEY}_saved_at`);
      localStorage.removeItem(LAST_RESULT_KEY);
      localStorage.removeItem(LAST_RESULT_PREV_KEY);
    } catch {
      // ignore
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestionsRow = useMemo(
    () =>
      suggestions.map((s) => (
        <button
          key={s}
          onClick={() => {
            setText(s);
            setTouched(true);
          }}
          className="btn-secondary rounded-full px-3 py-1.5 text-xs"
        >
          {s}
        </button>
      )),
    []
  );

  const recentRow = useMemo(
    () =>
      recentQueries.map((q) => (
        <button
          key={`${q.label}-${q.value}`}
          onClick={() => {
            if (q.disabled) return;
            setText(q.value);
            setTouched(true);
          }}
          className="btn-secondary rounded-full px-3 py-1.5 text-xs"
          disabled={q.disabled}
          title={q.disabled ? "File upload entries can't be re-used here." : q.value}
        >
          {q.label}
        </button>
      )),
    [recentQueries]
  );

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return "";
    const diff = Math.max(0, Date.now() - lastSavedAt);
    const mins = Math.floor(diff / 60000);
    if (mins === 0) return "Draft saved just now";
    if (mins === 1) return "Draft saved 1 min ago";
    return `Draft saved ${mins} min ago`;
  }, [lastSavedAt]);

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="glass rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-400/10 flex items-start justify-between gap-4">
          <div className="text-xs text-white/60">Research Query</div>
          <div className="flex-1">
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Analyze Text
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Paste a question or section of text and get subject predictions with top papers.
            </p>
          </div>
          <button
            className="btn-secondary rounded-xl px-3 py-2 text-xs"
            onClick={() => setSplitView((v) => !v)}
          >
            {splitView ? "Split view" : "List view"}
          </button>
        </div>

        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="text-xs text-white/50 mb-2">Input mode</div>
          <div className="flex flex-wrap gap-2">
            {(["question", "full_text"] as const).map((m) => (
              <button
                key={m}
                className={`btn-secondary rounded-full px-3 py-1.5 text-xs ${
                  mode === m ? "shadow-glow" : ""
                }`}
                onClick={() => setMode(m)}
              >
                {m === "question" ? "Question" : "Full text"}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="text-xs text-white/50 mb-2">Suggestions</div>
          <div className="flex flex-wrap gap-2">{suggestionsRow}</div>
        </div>

        {recentQueries.length > 0 && (
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-2">Recent queries</div>
            <div className="flex flex-wrap gap-2">{recentRow}</div>
          </div>
        )}

        <div className={`grid gap-6 ${splitView ? "lg:grid-cols-[1.05fr_1fr]" : "lg:grid-cols-1"}`}>
          {/* INPUT CARD */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="mb-2 flex items-center justify-between text-xs text-white/50">
              <span>Voice input</span>
              <VoiceButton value={text} onChange={updateText} />
            </div>
            <textarea
              className="textarea-field min-h-[200px] mb-4 text-base"
              placeholder={
                mode === "question"
                  ? "Enter your research question..."
                  : "Paste full text to analyze..."
              }
              value={text}
              onChange={(e) => {
                updateText(e.target.value);
              }}
              disabled={loading}
              onKeyDown={handleKeyDown}
            />

            <div className="flex flex-wrap items-center justify-between text-xs text-white/50 mb-3 gap-2">
              <span>
                {charCount} / {MAX_LEN} characters
              </span>
              <span>Words: {wordCount}</span>
              <span>Reading time: ~{readingTime} min</span>
              {nearLimit && <span className="text-yellow-300">Approaching limit</span>}
              {overLimit && <span className="text-red-300">Over limit</span>}
              <span>Tip: Cmd/Ctrl + Enter to submit</span>
            </div>

            {lastSavedLabel && (
              <div className="mb-3 text-xs text-white/50">{lastSavedLabel}</div>
            )}

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="glass-soft rounded-2xl p-4 border border-white/10 sticky bottom-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className={`px-2 py-1 rounded-full border border-white/10 ${loading ? "text-emerald-200" : ""}`}>
                    1. Input
                  </span>
                  <span className={`px-2 py-1 rounded-full border border-white/10 ${loading ? "text-emerald-200" : ""}`}>
                    2. Analyze
                  </span>
                  <span className={`px-2 py-1 rounded-full border border-white/10 ${data ? "text-emerald-200" : ""}`}>
                    3. Results
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) {
                          setText(clip);
                          setTouched(true);
                        }
                      } catch {
                        setError("Clipboard access blocked.");
                      }
                    }}
                    disabled={loading}
                  >
                    Paste
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleClear}
                    disabled={loading || !text}
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={loading || text.trim().length < 3 || overLimit}
                    isLoading={loading}
                  >
                    <Send className="w-4 h-4" />
                    {loading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* RESULTS */}
          <div className="space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-12 glass rounded-2xl border border-white/10">
                <Loader
                  size="lg"
                  text="Analyzing text and searching papers..."
                />
              </div>
            )}

            {data && !loading && (
              <div className="fade-up">
                <QueryResult data={data} />
              </div>
            )}

            {prevData && !loading && (
              <div className="fade-up">
                <div className="text-xs text-white/50 mb-2">
                  Previous result
                </div>
                <QueryResult data={prevData} />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
