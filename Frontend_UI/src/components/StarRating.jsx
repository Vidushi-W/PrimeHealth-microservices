/**
 * Read-only star display (0–5). Uses filled / half / empty stars for fractional averages.
 */
export default function StarRating({
  value = 0,
  max = 5,
  size = 'md',
  showValue = false,
  reviewCount,
  className = '',
}) {
  const v = Math.min(max, Math.max(0, Number(value) || 0));
  const sizeClass =
    size === 'sm' ? 'text-sm leading-none' : size === 'lg' ? 'text-xl leading-none' : 'text-base leading-none';

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}>
      <span
        className={`inline-flex gap-px ${sizeClass}`}
        role="img"
        aria-label={`${v.toFixed(1)} out of ${max} stars`}
      >
        {Array.from({ length: max }, (_, i) => {
          const filled = v >= i + 1 - 1e-6;
          const half = !filled && v + 1e-6 >= i + 0.5;
          if (half) {
            return (
              <span key={i} className="relative inline-flex w-[1em] shrink-0 justify-center" aria-hidden>
                <span className="text-slate-200">★</span>
                <span
                  className="absolute left-0 top-0 overflow-hidden text-amber-400"
                  style={{ width: '50%' }}
                >
                  ★
                </span>
              </span>
            );
          }
          return (
            <span key={i} className={filled ? 'text-amber-400' : 'text-slate-200'} aria-hidden>
              ★
            </span>
          );
        })}
      </span>
      {showValue ? (
        <span className="text-sm font-semibold tabular-nums text-slate-900">{v.toFixed(1)}</span>
      ) : null}
      {reviewCount != null && reviewCount !== '' ? (
        <span className="text-xs font-normal text-slate-500">({Number(reviewCount)})</span>
      ) : null}
    </span>
  );
}

/** Clickable 1–max stars for review forms. */
export function StarRatingInput({ value = 5, onChange, max = 5, size = 'md', className = '' }) {
  const v = Math.min(max, Math.max(1, Number(value) || 1));
  const sizeClass =
    size === 'sm' ? 'text-lg leading-none' : size === 'lg' ? 'text-2xl leading-none' : 'text-xl leading-none';

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="group" aria-label="Your rating">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const active = star <= v;
        return (
          <button
            key={star}
            type="button"
            className={`rounded p-0.5 leading-none transition ${active ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'}`}
            onClick={() => onChange?.(star)}
            aria-pressed={active}
            aria-label={`${star} out of ${max} stars`}
          >
            <span className={sizeClass} aria-hidden>
              ★
            </span>
          </button>
        );
      })}
    </span>
  );
}
