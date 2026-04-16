function EmptyState({ title, description }) {
  return (
    <div className="panel p-10 text-center">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default EmptyState;
