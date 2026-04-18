function SummaryCard({ label, value, helper }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default SummaryCard;
