type PaperMetaProps = {
  label: string;
  value: string;
};

export default function PaperMeta({ label, value }: PaperMetaProps) {
  return (
    <div className="glass-soft rounded-xl p-3 border border-white/10">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}
