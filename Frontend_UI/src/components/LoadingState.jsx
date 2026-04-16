function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="panel flex min-h-40 items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
        <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default LoadingState;
