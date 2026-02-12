import { useEffect, useMemo, useState } from 'react';
import { apiAdminFeedback } from '../../api/admin.api';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { getErrorMessage } from '../../utils/errors';
import toast from 'react-hot-toast';

type FeedbackItem = {
  id: string;
  user_id?: string | null;
  type?: string | null;
  message?: string | null;
  attachments?: string[];
  created_at?: string | null;
  source?: string | null;
  user_email?: string | null;
};

type FeedbackMeta = FeedbackItem & {
  status: 'new' | 'triaged' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  assignee: string;
  resolution: string;
  internal_note: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const formatAge = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const ms = Date.now() - d.getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return String(hours) + 'h';
  const days = Math.floor(hours / 24);
  return String(days) + 'd';
};

const ALL_TAGS = ['UI', 'Model', 'Billing', 'Abuse', 'Feature', 'Bug', 'Docs', 'Performance'];

const sentimentOf = (text: string) => {
  const t = text.toLowerCase();
  const pos = ['love', 'great', 'awesome', 'good', 'helpful'];
  const neg = ['bad', 'terrible', 'broken', 'hate', 'slow', 'bug', 'error', 'issue'];
  let score = 0;
  pos.forEach((w) => { if (t.includes(w)) score += 1; });
  neg.forEach((w) => { if (t.includes(w)) score -= 1; });
  if (score >= 2) return 'positive';
  if (score <= -2) return 'negative';
  return 'neutral';
};

const suggestTags = (text: string) => {
  const t = text.toLowerCase();
  const out = new Set<string>();
  if (t.includes('ui') || t.includes('design')) out.add('UI');
  if (t.includes('model') || t.includes('answer')) out.add('Model');
  if (t.includes('billing') || t.includes('payment')) out.add('Billing');
  if (t.includes('abuse') || t.includes('spam')) out.add('Abuse');
  if (t.includes('feature') || t.includes('request')) out.add('Feature');
  if (t.includes('bug') || t.includes('error')) out.add('Bug');
  if (t.includes('docs') || t.includes('documentation')) out.add('Docs');
  if (t.includes('slow') || t.includes('latency')) out.add('Performance');
  return Array.from(out);
};

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

const cx = (parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export default function AdminFeedback() {
  const [data, setData] = useState<FeedbackMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [priority, setPriority] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState<FeedbackMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = (await apiAdminFeedback()) as FeedbackItem[];
        const mapped: FeedbackMeta[] = (res || []).map((f) => ({
          ...f,
          status: 'new',
          priority: 'medium',
          tags: [],
          assignee: '',
          resolution: '',
          internal_note: '',
        }));
        setData(mapped);
        if (mapped.length) setCurrent(mapped[0]);
      } catch (e: unknown) {
        setError(getErrorMessage(e, 'Failed to load feedback'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;

    let rows = data.filter((f) => {
      const msg = (f.message || '').toLowerCase();
      const uid = (f.user_id || '').toLowerCase();
      if (q && !msg.includes(q) && !uid.includes(q)) return false;
      if (status !== 'all' && f.status !== status) return false;
      if (priority !== 'all' && f.priority !== priority) return false;
      if (type !== 'all' && (f.type || '') !== type) return false;
      const created = f.created_at ? new Date(f.created_at) : null;
      if (start && (!created || created < start)) return false;
      if (end && (!created || created > end)) return false;
      return true;
    });

    if (sort === 'oldest') {
      rows = rows.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    } else if (sort === 'priority') {
      const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
      rows = rows.slice().sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0));
    } else {
      rows = rows.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }

    return rows;
  }, [data, search, status, priority, type, startDate, endDate, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const filteredIds = filtered.map((f) => f.id);
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const updateItem = (id: string, patch: Partial<FeedbackMeta>) => {
    setData((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setCurrent((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.key === 'j') {
        e.preventDefault();
        const idx = filteredIds.indexOf(current.id);
        const next = filteredIds[idx + 1];
        if (next) setCurrent(data.find((d) => d.id === next) || null);
      }
      if (e.key === 'k') {
        e.preventDefault();
        const idx = filteredIds.indexOf(current.id);
        const prev = filteredIds[idx - 1];
        if (prev) setCurrent(data.find((d) => d.id === prev) || null);
      }
      if (e.key === 'r') {
        e.preventDefault();
        updateItem(current.id, { status: 'resolved' });
      }
      if (e.key === 'e') {
        e.preventDefault();
        updateItem(current.id, { priority: 'high' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, data, filteredIds]);

  const bulkResolve = () => {
    selectedIds.forEach((id) => updateItem(id, { status: 'resolved' }));
    setSelected({});
    toast.success('Selected feedback resolved');
  };

  const bulkExport = () => {
    if (!filtered.length) return;
    const rows = filtered.map((f) => ({
      id: f.id,
      type: f.type || '',
      status: f.status,
      priority: f.priority,
      user: f.user_id || '',
      created_at: f.created_at || '',
      message: (f.message || '').replace(/\n/g, ' '),
    }));
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map((r) => Object.values(r).join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToIssue = (id: string) => {
    const item = data.find((d) => d.id === id);
    if (!item) return;
    const payload = {
      title: '[Feedback] ' + (item.type || 'general').toUpperCase(),
      body: item.message || '',
      user: item.user_id || 'anonymous',
      created_at: item.created_at || null,
      priority: item.priority,
      tags: item.tags,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback-issue-' + id + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const types = useMemo(() => {
    const set = new Set<string>();
    data.forEach((f) => {
      if (f.type) set.add(f.type);
    });
    return Array.from(set);
  }, [data]);

  const duplicates = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((f) => {
      const key = normalize(f.message || '');
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [data]);

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <Loader size='lg' text='Loading feedback...' />
      </div>
    );
  }

  if (error) return <div className='text-sm text-red-300'>{error}</div>;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold text-white/90'>Feedback Review</h1>
          <p className='text-sm text-white/50 mt-1'>Triage, resolve, and escalate user feedback.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            className='px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60'
            onClick={bulkResolve}
            disabled={selectedIds.length === 0}
          >
            Resolve selected
          </button>
          <button
            className='px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60'
            onClick={bulkExport}
          >
            Export CSV
          </button>
        </div>
      </div>

      <Card>
        <div className='grid gap-3 md:grid-cols-6'>
          <input
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50 md:col-span-2'
            placeholder='Search message or user'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value='all'>All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value='all'>All status</option>
            <option value='new'>New</option>
            <option value='triaged'>Triaged</option>
            <option value='resolved'>Resolved</option>
          </select>
          <select
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value='all'>All priority</option>
            <option value='low'>Low</option>
            <option value='medium'>Medium</option>
            <option value='high'>High</option>
          </select>
          <select
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value='newest'>Newest</option>
            <option value='oldest'>Oldest</option>
            <option value='priority'>Priority</option>
          </select>
        </div>
        <div className='mt-3 grid gap-3 md:grid-cols-4'>
          <input
            type='date'
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type='date'
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            className='rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70'
            onClick={() => {
              setSearch('');
              setStatus('all');
              setPriority('all');
              setType('all');
              setStartDate('');
              setEndDate('');
              setSort('newest');
              setPage(1);
            }}
          >
            Clear filters
          </button>
          <div className='flex gap-2'>
            <select
              className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
            </select>
            <div className='text-xs text-white/50 flex items-center'>
              Page {page} of {totalPages}
            </div>
          </div>
        </div>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[2.1fr_1fr]'>
        <Card>
          <div className='divide-y divide-white/5'>
            {pageRows.length === 0 && (
              <div className='px-4 py-10 text-sm text-white/50 text-center'>No feedback found.</div>
            )}
            {pageRows.map((f) => {
              const sentiment = sentimentOf(f.message || '');
              const dupCount = duplicates[normalize(f.message || '')] || 1;
              return (
                <div
                  key={f.id}
                  className={cx(['px-4 py-4 text-sm hover:bg-white/5 cursor-pointer', current?.id === f.id && 'bg-white/10'])}
                  onClick={() => setCurrent(f)}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-xs uppercase tracking-[0.2em] text-white/40'>{(f.type || 'unknown').toUpperCase()}</div>
                      <div className='text-white/90 mt-1 line-clamp-2'>{f.message || 'No message'}</div>
                      <div className='text-xs text-white/50 mt-1'>{f.user_id || 'Anonymous'} · {f.user_email || 'No email'}</div>
                      <div className='text-[11px] text-white/40 mt-1'>Source: {f.source || 'web'}</div>
                    </div>
                    <div className='text-right text-xs text-white/50'>
                      <div>{formatAge(f.created_at)}</div>
                      <div className='mt-2 flex items-center gap-2 justify-end'>
                        <span className={cx([
                          'px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.2em]',
                          f.priority === 'high' && 'bg-red-500/10 text-red-200',
                          f.priority === 'medium' && 'bg-amber-500/10 text-amber-200',
                          f.priority === 'low' && 'bg-emerald-500/10 text-emerald-200',
                        ])}>
                          {f.priority}
                        </span>
                        <span className={cx([
                          'px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.2em]',
                          f.status === 'resolved' && 'bg-emerald-500/10 text-emerald-200',
                          f.status === 'triaged' && 'bg-indigo-500/10 text-indigo-200',
                          f.status === 'new' && 'bg-white/10 text-white/70',
                        ])}>
                          {f.status}
                        </span>
                      </div>
                      <div className='text-[11px] text-white/40 mt-2'>Sentiment: {sentiment}</div>
                      {dupCount > 1 && <div className='text-[11px] text-white/40'>Duplicates: {dupCount}</div>}
                    </div>
                  </div>
                  <div className='mt-3 flex items-center gap-3 text-xs text-white/50'>
                    <input
                      type='checkbox'
                      checked={!!selected[f.id]}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                    />
                    <button
                      className='text-white/60 hover:text-white'
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItem(f.id, { status: 'resolved' });
                      }}
                    >
                      Mark resolved
                    </button>
                    <button
                      className='text-white/60 hover:text-white'
                      onClick={(e) => {
                        e.stopPropagation();
                        updateItem(f.id, { priority: 'high' });
                      }}
                    >
                      Escalate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className='flex items-center justify-between px-4 py-3 text-xs text-white/50'>
            <button
              className='px-3 py-2 rounded-full border border-white/10'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className='px-3 py-2 rounded-full border border-white/10'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </Card>

        <Card className='lg:sticky lg:top-6 h-fit'>
          {!current && (
            <div className='px-4 py-10 text-sm text-white/50 text-center'>Select feedback to view details.</div>
          )}
          {current && (
            <div className='p-4 space-y-4 text-sm'>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Summary</div>
                <div className='text-white/90 font-semibold'>{current.message || 'No message'}</div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Type</div>
                  <div className='text-white/80'>{current.type || 'Unknown'}</div>
                </div>
                <div>
                  <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Created</div>
                  <div className='text-white/80'>{formatDate(current.created_at)}</div>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <div className='text-xs uppercase tracking-[0.2em] text-white/40'>User</div>
                  <div className='text-white/80'>{current.user_id || 'Anonymous'}</div>
                </div>
                <div>
                  <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Source</div>
                  <div className='text-white/80'>{current.source || 'web'}</div>
                </div>
              </div>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Status</div>
                <div className='mt-2 flex gap-2'>
                  {(['new', 'triaged', 'resolved'] as const).map((s) => (
                    <button
                      key={s}
                      className={cx([
                        'px-3 py-2 rounded-lg text-xs border',
                        current.status === s ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-white/60',
                      ])}
                      onClick={() => updateItem(current.id, { status: s })}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Priority</div>
                <div className='mt-2 flex gap-2'>
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      className={cx([
                        'px-3 py-2 rounded-lg text-xs border',
                        current.priority === p ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-white/60',
                      ])}
                      onClick={() => updateItem(current.id, { priority: p })}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Tags</div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {ALL_TAGS.map((t) => {
                    const active = current.tags.includes(t);
                    return (
                      <button
                        key={t}
                        className={cx([
                          'px-3 py-2 rounded-lg text-xs border',
                          active ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-white/60',
                        ])}
                        onClick={() => {
                          const next = active
                            ? current.tags.filter((x) => x !== t)
                            : [...current.tags, t];
                          updateItem(current.id, { tags: next });
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <div className='text-[11px] text-white/40 mt-2'>Suggestions: {suggestTags(current.message || '').join(', ') || 'None'}</div>
              </div>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Assignee</div>
                <input
                  className='mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
                  placeholder='Assign admin'
                  value={current.assignee}
                  onChange={(e) => updateItem(current.id, { assignee: e.target.value })}
                />
              </div>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Internal note</div>
                <textarea
                  className='mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50 min-h-[90px]'
                  placeholder='Add internal note'
                  value={current.internal_note}
                  onChange={(e) => updateItem(current.id, { internal_note: e.target.value })}
                />
              </div>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Resolution notes</div>
                <textarea
                  className='mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50 min-h-[120px]'
                  placeholder='Add resolution notes'
                  value={current.resolution}
                  onChange={(e) => updateItem(current.id, { resolution: e.target.value })}
                />
              </div>
              <div>
                <div className='text-xs uppercase tracking-[0.2em] text-white/40'>Attachments</div>
                <div className='text-xs text-white/60 mt-1'>
                  {current.attachments?.length ? current.attachments.join(', ') : 'No attachments'}
                </div>
              </div>
              <div className='flex gap-2'>
                <button
                  className='rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70'
                  onClick={() => updateItem(current.id, { status: 'resolved' })}
                >
                  Mark resolved
                </button>
                <button
                  className='rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70'
                  onClick={() => updateItem(current.id, { priority: 'high' })}
                >
                  Escalate
                </button>
                <button
                  className='rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70'
                  onClick={() => convertToIssue(current.id)}
                >
                  Convert to issue
                </button>
              </div>
              <div className='text-xs text-white/40'>Shortcuts: j/k navigate, r resolve, e escalate.</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
