import { useEffect, useMemo, useState } from 'react';
import { apiAdminModelPerformance } from '../../api/admin.api';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { getErrorMessage } from '../../utils/errors';
import toast from 'react-hot-toast';

type DailyPoint = {
  date: string;
  avg: number;
  count: number;
};

type Drift = {
  delta: number;
  trend: string;
};

type ErrorDaily = {
  date: string;
  error_rate: number;
  status_4xx: number;
  status_5xx: number;
  total_requests: number;
  latency_avg_ms: number;
};

type Coverage = {
  total: number;
  with_context: number;
  pct: number;
};

type LatencyBucket = { bucket: string; count: number };

type SegmentItem = { subject?: string; role?: string; model?: string; source?: string; endpoint?: string; count?: number; tokens?: number };

type ModelPerfResponse = {
  avg_confidence?: number;
  daily?: DailyPoint[];
  drift?: Drift;
  latency_avg_ms?: number;
  latency_p95_ms?: number | null;
  latency_p99_ms?: number | null;
  latency_histogram?: LatencyBucket[];
  error_rate?: number;
  errors_daily?: ErrorDaily[];
  status_breakdown?: { '2xx'?: number; '4xx'?: number; '5xx'?: number };
  coverage?: Coverage;
  model_usage?: { model: string; tokens: number }[];
  segments?: { subject?: SegmentItem[]; role?: SegmentItem[]; model?: SegmentItem[]; source?: SegmentItem[]; endpoint?: SegmentItem[] };
  range_days?: number;
};

const num = (v: any, d = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const cx = (parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
const pct = (v: number, d = 0) => (num(v, d) * 100).toFixed(2) + '%';

export default function AdminModelPerformance() {
  const [data, setData] = useState<ModelPerfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(14);
  const [segment, setSegment] = useState('subject');
  const [compare, setCompare] = useState(false);
  const [thresholdConf, setThresholdConf] = useState(0.6);
  const [thresholdLatency, setThresholdLatency] = useState(2000);
  const [thresholdError, setThresholdError] = useState(0.02);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiAdminModelPerformance(rangeDays);
        setData(res || {});
      } catch (e: unknown) {
        setError(getErrorMessage(e, 'Failed to load model performance'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [rangeDays]);

  const daily = (data?.daily || []) as DailyPoint[];
  const sortedDaily = useMemo(() => {
    return [...daily].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [daily]);

  const drift = data?.drift || { delta: 0, trend: 'flat' };
  const latencyAvg = num(data?.latency_avg_ms, 0);
  const errorRate = num(data?.error_rate, 0);
  const coveragePct = num(data?.coverage?.pct, 0) * 100;
  const latencyP95 = data?.latency_p95_ms ?? null;
  const latencyP99 = data?.latency_p99_ms ?? null;
  const errorsDaily = (data?.errors_daily || []) as ErrorDaily[];
  const latencyHistogram = (data?.latency_histogram || []) as LatencyBucket[];

  const avgConfidence = num(data?.avg_confidence, 0);
  const dailyValues = sortedDaily.map((d) => num(d.avg, 0));
  const dailyAvg = dailyValues.length ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length : 0;
  const bestDay = sortedDaily.reduce(
    (acc, cur) => (num(cur.avg, 0) > num(acc.avg, -1) ? cur : acc),
    { date: '', avg: -1, count: 0 } as DailyPoint
  );
  const worstDay = sortedDaily.reduce(
    (acc, cur) => (num(cur.avg, 1) < num(acc.avg, 2) ? cur : acc),
    { date: '', avg: 2, count: 0 } as DailyPoint
  );
  const variance = dailyValues.length
    ? dailyValues.reduce((a, b) => a + Math.pow(b - dailyAvg, 2), 0) / dailyValues.length
    : 0;
  const volatility = Math.sqrt(variance);

  const prevCompare = useMemo(() => {
    if (!compare || sortedDaily.length < 8 || rangeDays < 14) return null;
    const mid = Math.floor(sortedDaily.length / 2);
    const prev = sortedDaily.slice(0, mid);
    const next = sortedDaily.slice(mid);
    const prevAvg = prev.length ? prev.reduce((a, b) => a + num(b.avg, 0), 0) / prev.length : 0;
    const nextAvg = next.length ? next.reduce((a, b) => a + num(b.avg, 0), 0) / next.length : 0;
    const delta = nextAvg - prevAvg;
    return { prevAvg, nextAvg, delta };
  }, [compare, sortedDaily, rangeDays]);

  const kpis = [
    { label: 'Avg confidence', value: avgConfidence.toFixed(3) },
    { label: 'Drift', value: drift.delta.toFixed(3), sub: drift.trend },
    { label: 'Coverage', value: coveragePct.toFixed(1) + '%' },
    { label: 'Latency avg', value: latencyAvg ? String(latencyAvg) + ' ms' : 'N/A' },
    { label: 'Latency p95', value: latencyP95 ? String(latencyP95) + ' ms' : 'N/A' },
    { label: 'Latency p99', value: latencyP99 ? String(latencyP99) + ' ms' : 'N/A' },
    { label: 'Error rate', value: (errorRate * 100).toFixed(2) + '%' },
    { label: 'Requests', value: String(num(data?.coverage?.total, 0)) },
  ];

  const segments = data?.segments || {};
  const segmentRows: SegmentItem[] =
    segment === 'subject' ? (segments.subject || []) :
    segment === 'role' ? (segments.role || []) :
    segment === 'model' ? (segments.model || []) :
    segment === 'source' ? (segments.source || []) :
    (segments.endpoint || []);

  const modelUsage = data?.model_usage || [];
  const totalTokens = modelUsage.reduce((a, b) => a + num(b.tokens, 0), 0);
  const latencySamplesTotal = latencyHistogram.reduce((a, b) => a + num(b.count, 0), 0);

  const status2xx = num(data?.status_breakdown?.['2xx'], 0);
  const status4xx = num(data?.status_breakdown?.['4xx'], 0);
  const status5xx = num(data?.status_breakdown?.['5xx'], 0);
  const totalStatus = status2xx + status4xx + status5xx;
  const warnConf = avgConfidence > 0 && avgConfidence < thresholdConf;
  const warnLatency = latencyAvg > thresholdLatency;
  const warnError = errorRate > thresholdError;

  const exportCsv = () => {
    if (!daily.length) return;
    const header = 'date,avg,count';
    const body = daily.map((d) => [d.date, d.avg, d.count].join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model-performance.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <Loader size='lg' text='Loading model performance...' />
      </div>
    );
  }

  if (error) return <div className='text-sm text-red-300'>{error}</div>;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold text-white/90'>Model Performance</h1>
          <p className='text-sm text-white/50 mt-1'>Track quality, latency, and stability over time.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <select
            className='rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
            value={String(rangeDays)}
            onChange={(e) => setRangeDays(Number(e.target.value))}
          >
            <option value='7'>Last 7 days</option>
            <option value='14'>Last 14 days</option>
            <option value='30'>Last 30 days</option>
          </select>
          <button
            className='px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60'
            onClick={() => setCompare((v) => !v)}
          >
            {compare ? 'Compare on' : 'Compare off'}
          </button>
          <button
            className='px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60'
            onClick={() => { exportCsv(); toast.success('Exported CSV'); }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-8'>
        {kpis.map((k) => (
          <Card key={k.label} className='p-4'>
            <div className='text-xs uppercase tracking-[0.2em] text-white/40'>{k.label}</div>
            <div className='text-2xl font-semibold mt-2'>{k.value}</div>
            {k.sub && <div className='text-xs text-white/50 mt-1'>{k.sub}</div>}
          </Card>
        ))}
      </div>

      <Card>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-sm font-semibold text-white/80'>Daily confidence</div>
            <div className='text-xs text-white/50'>Range: {rangeDays} days</div>
          </div>
          <div className='text-xs text-white/50'>Records: {daily.length}</div>
        </div>
        <div className='mt-4 grid gap-2'>
          {daily.length === 0 && <div className='text-sm text-white/50'>No data.</div>}
          {sortedDaily.map((d) => (
            <div key={d.date} className='flex items-center gap-3'>
              <div className='w-24 text-xs text-white/50'>{d.date}</div>
              <div className='flex-1 h-2 bg-white/5 rounded-full overflow-hidden'>
                <div
                  className='h-full bg-emerald-400/70'
                  style={{ width: String(clamp(num(d.avg, 0) * 100, 4, 100)) + '%' }}
                />
              </div>
              <div className='w-14 text-xs text-white/70 text-right'>{num(d.avg, 0).toFixed(3)}</div>
            </div>
          ))}
        </div>
        {prevCompare && (
          <div className='mt-4 text-xs text-white/60'>
            Previous period avg: {prevCompare.prevAvg.toFixed(3)} | Current period avg: {prevCompare.nextAvg.toFixed(3)} | Delta: {prevCompare.delta.toFixed(3)}
          </div>
        )}
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <div className='text-sm font-semibold text-white/80'>Latency & Errors</div>
          <div className='mt-3 grid gap-2 text-sm text-white/60'>
            <div>Latency avg: {latencyAvg ? String(latencyAvg) + ' ms' : 'N/A'}</div>
            <div>Error rate: {pct(errorRate, 0)}</div>
            <div>Status 4xx: {status4xx}</div>
            <div>Status 5xx: {status5xx}</div>
          </div>
          <div className='mt-4 grid gap-2'>
            {[
              { label: '2xx', value: status2xx, tone: 'bg-emerald-400/70' },
              { label: '4xx', value: status4xx, tone: 'bg-amber-400/70' },
              { label: '5xx', value: status5xx, tone: 'bg-rose-400/70' },
            ].map((s) => (
              <div key={s.label} className='flex items-center gap-3 text-xs text-white/50'>
                <div className='w-10'>{s.label}</div>
                <div className='flex-1 h-2 bg-white/5 rounded-full overflow-hidden'>
                  <div
                    className={cx(['h-full', s.tone])}
                    style={{ width: totalStatus ? String(clamp((s.value / totalStatus) * 100, 2, 100)) + '%' : '2%' }}
                  />
                </div>
                <div className='w-16 text-right'>{totalStatus ? ((s.value / totalStatus) * 100).toFixed(1) + '%' : '0%'}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className='text-sm font-semibold text-white/80'>Diagnostics</div>
          <div className='mt-3 grid gap-2 text-sm text-white/60'>
            <div>Drift indicator: {drift.trend}</div>
            <div>Coverage with context: {coveragePct.toFixed(1)}%</div>
            <div>Total requests: {num(data?.coverage?.total, 0)}</div>
            <div>Daily avg: {dailyAvg.toFixed(3)}</div>
            <div>Volatility (std dev): {volatility.toFixed(3)}</div>
            <div>Best day: {bestDay.date || 'N/A'} ({bestDay.avg.toFixed(3)})</div>
            <div>Worst day: {worstDay.date || 'N/A'} ({worstDay.avg.toFixed(3)})</div>
          </div>
        </Card>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <div className='flex items-center justify-between'>
            <div className='text-sm font-semibold text-white/80'>Error & latency trend</div>
            <div className='text-xs text-white/50'>{errorsDaily.length} days</div>
          </div>
          <div className='mt-4 grid gap-2'>
            {errorsDaily.length === 0 && <div className='text-sm text-white/50'>No data.</div>}
            {errorsDaily.map((d) => (
              <div key={d.date} className='grid gap-2'>
                <div className='flex items-center justify-between text-xs text-white/50'>
                  <span>{d.date}</span>
                  <span>{(num(d.error_rate, 0) * 100).toFixed(2)}% errors</span>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-20 text-xs text-white/40'>Err rate</div>
                  <div className='flex-1 h-2 bg-white/5 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-rose-400/70'
                      style={{ width: String(clamp(num(d.error_rate, 0) * 100, 2, 100)) + '%' }}
                    />
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-20 text-xs text-white/40'>Latency</div>
                  <div className='flex-1 h-2 bg-white/5 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-sky-400/70'
                      style={{ width: String(clamp(num(d.latency_avg_ms, 0) / 50, 2, 100)) + '%' }}
                    />
                  </div>
                  <div className='w-16 text-xs text-white/60 text-right'>{d.latency_avg_ms || 0} ms</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className='text-sm font-semibold text-white/80'>Latency histogram (approx)</div>
          <div className='mt-3 grid gap-2 text-sm text-white/60'>
            {latencyHistogram.length === 0 && <div>No latency samples yet.</div>}
            {latencyHistogram.map((b) => (
              <div key={b.bucket} className='flex items-center gap-3'>
                <div className='w-20 text-xs text-white/50'>{b.bucket}</div>
                <div className='flex-1 h-2 bg-white/5 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-amber-400/70'
                    style={{ width: latencySamplesTotal ? String(clamp((num(b.count, 0) / latencySamplesTotal) * 100, 2, 100)) + '%' : '2%' }}
                  />
                </div>
                <div className='w-16 text-right'>{b.count}</div>
              </div>
            ))}
          </div>
          <div className='mt-3 text-xs text-white/40'>p95/p99 are estimated from buckets.</div>
        </Card>
      </div>

      <Card>
        <div className='flex items-center justify-between'>
          <div className='text-sm font-semibold text-white/80'>Segmented views</div>
          <div className='flex gap-2'>
            {['subject', 'role', 'model', 'source', 'endpoint'].map((s) => (
              <button
                key={s}
                className={cx([
                  'px-3 py-2 rounded-lg text-xs border',
                  segment === s ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-white/60',
                ])}
                onClick={() => setSegment(s)}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className='mt-4 grid gap-2 text-sm text-white/60'>
          {segmentRows.length === 0 && <div>No segmented data.</div>}
          {segmentRows.map((r, i) => (
            <div key={i} className='flex items-center justify-between'>
              <span>{r.subject || r.role || r.model || r.source || r.endpoint || 'Unknown'}</span>
              <span>{r.count || r.tokens || 0}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <div className='text-sm font-semibold text-white/80'>Model usage</div>
          <div className='mt-3 grid gap-2 text-sm text-white/60'>
            {modelUsage.length === 0 && <div>No model usage data.</div>}
            {modelUsage.map((m) => (
              <div key={m.model} className='flex items-center gap-3'>
                <div className='w-36 truncate'>{m.model}</div>
                <div className='flex-1 h-2 bg-white/5 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-sky-400/70'
                    style={{ width: totalTokens ? String(clamp((num(m.tokens, 0) / totalTokens) * 100, 2, 100)) + '%' : '2%' }}
                  />
                </div>
                <div className='w-20 text-right'>{totalTokens ? ((num(m.tokens, 0) / totalTokens) * 100).toFixed(1) + '%' : '0%'}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className='text-sm font-semibold text-white/80'>Alert thresholds</div>
          <div className='mt-3 grid gap-3 md:grid-cols-3'>
            <div>
              <div className='text-xs text-white/50'>Alert: confidence &lt;</div>
              <input
                type='number'
                step='0.01'
                className='mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
                value={thresholdConf}
                onChange={(e) => setThresholdConf(Number(e.target.value))}
              />
            </div>
            <div>
              <div className='text-xs text-white/50'>Alert: latency &gt; ms</div>
              <input
                type='number'
                className='mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
                value={thresholdLatency}
                onChange={(e) => setThresholdLatency(Number(e.target.value))}
              />
            </div>
            <div>
              <div className='text-xs text-white/50'>Alert: error rate &gt;</div>
              <input
                type='number'
                step='0.01'
                className='mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50'
                value={thresholdError}
                onChange={(e) => setThresholdError(Number(e.target.value))}
              />
            </div>
          </div>
          <div className='mt-4 grid gap-2 text-sm'>
            <div className={cx(['px-3 py-2 rounded-lg border', warnConf ? 'border-amber-300/40 text-amber-200' : 'border-emerald-300/30 text-emerald-200'])}>
              Confidence status: {warnConf ? 'Below threshold' : 'Healthy'}
            </div>
            <div className={cx(['px-3 py-2 rounded-lg border', warnLatency ? 'border-amber-300/40 text-amber-200' : 'border-emerald-300/30 text-emerald-200'])}>
              Latency status: {warnLatency ? 'Above threshold' : 'Healthy'}
            </div>
            <div className={cx(['px-3 py-2 rounded-lg border', warnError ? 'border-amber-300/40 text-amber-200' : 'border-emerald-300/30 text-emerald-200'])}>
              Error rate status: {warnError ? 'Above threshold' : 'Healthy'}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
