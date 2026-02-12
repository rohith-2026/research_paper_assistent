import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { apiQueryFile, QueryResponse } from '../../api/assistant.api';
import QueryResult from '../../components/assistant/QueryResult';
import PageShell from '../../components/layout/PageShell';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { getErrorMessage } from "../../utils/errors";

export default function QueryFile() {
  const LAST_RESULT_KEY = "rpa_query_file_last_result";
  const LAST_RESULT_PREV_KEY = "rpa_query_file_last_result_prev";
  const MAX_FILE_MB = 20;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
  const steps = ["Upload", "Extract", "Analyze", "Results"];

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QueryResponse | null>(null);
  const [prevData, setPrevData] = useState<QueryResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [splitView, setSplitView] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_RESULT_KEY);
      if (last) setData(JSON.parse(last));
      const prev = localStorage.getItem(LAST_RESULT_PREV_KEY);
      if (prev) setPrevData(JSON.parse(prev));
    } catch {
      // ignore
    }
  }, []);

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

  const validateFile = (selected: File) => {
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      return 'Only PDF and DOCX files are supported';
    }
    if (selected.size > MAX_FILE_BYTES) {
      return `File too large. Max ${MAX_FILE_MB} MB.`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selected);
    setError(null);
    setData(null);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    const validationError = validateFile(dropped);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(dropped);
    setError(null);
    setData(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError(null);
    if (data) setPrevData(data);
    setData(null);

    try {
      setLoading(true);
      const res = await apiQueryFile(file);
      setData(res);
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Upload failed");
      if (msg.toLowerCase().includes("unauthorized")) {
        setError("Session expired. Please log in again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setData(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    try {
      localStorage.removeItem(LAST_RESULT_KEY);
      localStorage.removeItem(LAST_RESULT_PREV_KEY);
    } catch {
      // ignore
    }
  };

  const fileLabel = useMemo(() => {
    if (!file) return null;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return `${ext?.toUpperCase() || "FILE"} - ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="glass rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-400/10 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-white/60">Research Upload</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Analyze File
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Upload a PDF or DOCX and we'll extract text, predict subject areas, and find papers.
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
          <div className="text-xs text-white/50 mb-2">File requirements</div>
          <div className="flex flex-wrap gap-2">
            {["PDF or DOCX", `Max ${MAX_FILE_MB} MB`, "Text extract + analysis"].map((t) => (
              <span key={t} className="btn-secondary rounded-full px-3 py-1.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className={`grid gap-6 ${splitView ? "lg:grid-cols-[1.05fr_1fr]" : "lg:grid-cols-1"}`}>
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                isDragging ? "border-emerald-300/40 bg-emerald-400/5" : "border-white/20 hover:border-white/30"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-white/40" />
              <p className="text-sm font-medium mb-1">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-white/50">
                PDF or DOCX files only - Max {MAX_FILE_MB} MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {file && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl glass-soft">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-white/50">
                    {fileLabel}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="p-2 rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="glass-soft rounded-2xl p-4 border border-white/10 mt-4 sticky bottom-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  {steps.map((s, idx) => (
                    <span
                      key={s}
                      className={`px-2 py-1 rounded-full border border-white/10 ${
                        loading && idx < 3 ? "text-emerald-200" : ""
                      }`}
                    >
                      {idx + 1}. {s}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleClear}
                    disabled={loading || !file}
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={loading || !file}
                    isLoading={loading}
                  >
                    <Upload className="w-4 h-4" />
                    {loading ? 'Processing...' : 'Analyze File'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-12 glass rounded-2xl border border-white/10">
                <Loader size="lg" text="Extracting text and analyzing..." />
              </div>
            )}

            {data && !loading && (
              <QueryResult data={data} viewMode={viewMode} onViewModeChange={setViewMode} />
            )}

            {prevData && !loading && (
              <div className="fade-up mt-6">
                <div className="text-xs text-white/50 mb-2">Previous result</div>
                <QueryResult data={prevData} viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

