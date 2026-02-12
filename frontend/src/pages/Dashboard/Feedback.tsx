import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { Star, Bug, Sparkles, Monitor, Paperclip, X } from "lucide-react";
import api from "../../api/axios";
import { getErrorMessage } from "../../utils/errors";
import VoiceButton from "../../components/ui/VoiceButton";

export default function Feedback() {
  const [rating, setRating] = useState(4);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [includeContext, setIncludeContext] = useState(true);
  const [type, setType] = useState<"model" | "ui" | "bug">("ui");
  const [status, setStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; type: string; message: string; created_at: string }[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const types = ["model", "ui", "bug"] as const;

  useEffect(() => {
    api
      .get("/feedback")
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]));
  }, []);

  const compiledMessage = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Rating: ${rating}/5`);
    if (title.trim()) parts.push(`Title: ${title.trim()}`);
    if (text.trim()) parts.push(`Message: ${text.trim()}`);
    if (type === "bug") {
      if (steps.trim()) parts.push(`Steps: ${steps.trim()}`);
      if (expected.trim()) parts.push(`Expected: ${expected.trim()}`);
      if (actual.trim()) parts.push(`Actual: ${actual.trim()}`);
    }
    if (includeContext) parts.push(`Page: Feedback`);
    return parts.join("\n");
  }, [rating, title, text, type, steps, expected, actual, includeContext]);

  const submit = async () => {
    if (!text.trim() && !title.trim()) return;
    try {
      setStatus(null);
      const res = await api.post("/feedback", { type, message: compiledMessage, attachments: attachments.map((a) => a.url) });
      setStatus("Thanks! Feedback submitted.");
      setText("");
      setTitle("");
      setSteps("");
      setExpected("");
      setActual("");
      setAttachments([]);
      setHistory((prev) => [res.data, ...prev].slice(0, 6));
    } catch (e: unknown) {
      setStatus(getErrorMessage(e, "Failed to submit feedback."));
    }
  };

  return (
    <PageShell title="Feedback" subtitle="Help improve the platform">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-2xl p-6 border border-white/10">
          <div className="text-sm font-semibold">Category</div>
          <div className="mt-3 flex gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-xl text-sm border ${
                  type === t
                    ? "bg-emerald-400/15 border-emerald-300/30 text-emerald-100"
                    : "bg-white/5 border-white/10 text-white/70"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mt-6 text-sm font-semibold">Rating</div>
          <div className="mt-3 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={`p-2 rounded-xl border ${
                  r <= rating
                    ? "bg-emerald-400/15 border-emerald-300/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <Star className="w-4 h-4" />
              </button>
            ))}
            <span className="text-xs text-white/60">{rating}/5</span>
          </div>

          <div className="mt-6 text-sm font-semibold">Title</div>
          <div className="mt-3 flex items-center gap-2">
            <input
              className="input-field flex-1"
              placeholder="Short summary of your feedback"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <VoiceButton value={title} onChange={setTitle} />
          </div>

          <div className="mt-6 text-sm font-semibold">
            {type === "bug" ? "Bug Description" : "Feedback"}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/50 mb-2">
              <span>Voice input</span>
              <VoiceButton value={text} onChange={setText} />
            </div>
            <textarea
              className="textarea-field min-h-[160px]"
              placeholder="What can we improve?"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {type === "bug" && (
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Steps to reproduce"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                />
                <VoiceButton value={steps} onChange={setSteps} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Expected behavior"
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                />
                <VoiceButton value={expected} onChange={setExpected} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Actual behavior"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
                <VoiceButton value={actual} onChange={setActual} />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
            />
            <span>Include page context</span>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold">Attachments</div>
            <div className="mt-2 flex items-center gap-2">
              <label className="btn-secondary px-3 py-2 rounded-xl cursor-pointer">
                <Paperclip className="w-4 h-4" />
                Add file
                <input
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.append("file", file);
                    try {
                      const res = await api.post("/feedback/attachments", form, {
                        headers: { "Content-Type": "multipart/form-data" },
                      });
                      setAttachments((prev) => [...prev, { name: file.name, url: res.data.url }]);
                    } catch {
                      setStatus("Failed to upload attachment.");
                    }
                  }}
                />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2 text-xs text-white/70">
                {attachments.map((a) => (
                  <div key={a.url} className="flex items-center justify-between">
                    <span className="truncate">{a.name}</span>
                    <button
                      className="btn-secondary px-2 py-1 rounded-lg"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((x) => x.url !== a.url))
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button className="btn-primary px-4 py-2 rounded-xl" onClick={submit}>
              Submit
            </button>
            <span className="text-xs text-white/50">Responses are anonymous.</span>
          </div>
          {status && <div className="mt-3 text-xs text-white/60">{status}</div>}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 border border-white/10">
            <div className="text-sm font-semibold">Quick tips</div>
            <div className="mt-3 grid gap-2 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-200" />
                Include steps to reproduce for bugs.
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-200" />
                Mention the page where it happened.
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-200" />
                Suggest how you want it to behave.
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 border border-white/10">
            <div className="text-sm font-semibold">Preview</div>
            <pre className="mt-3 whitespace-pre-wrap text-xs text-white/70">
{compiledMessage || "Your feedback will appear here."}
            </pre>
          </div>

          <div className="glass rounded-2xl p-5 border border-white/10">
            <div className="text-sm font-semibold">Recent feedback</div>
            <div className="mt-3 space-y-2 text-xs text-white/70">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="glass-soft rounded-xl p-3 border border-white/10">
                  <div className="text-[10px] text-white/50">
                    {h.type.toUpperCase()} • {new Date(h.created_at).toLocaleString()}
                  </div>
                  <div className="mt-1">{h.message.slice(0, 140)}</div>
                </div>
              ))}
              {!history.length && <div className="text-white/50">No feedback yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
