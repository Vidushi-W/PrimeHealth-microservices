import clsx from '../utils/clsx';

function SlotCard({ slot, onBook, disabled }) {
  const isAvailable = slot.status === 'available';

  return (
    <button
      type="button"
      onClick={() => isAvailable && onBook?.(slot)}
      disabled={disabled || !isAvailable}
      className={clsx(
        'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
        isAvailable
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100'
          : 'cursor-not-allowed border-red-200 bg-red-50 text-red-700',
        disabled && 'opacity-60'
      )}
    >
      <div>
        <p className="text-sm font-semibold">
          {slot.start} - {slot.end}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em]">{slot.status}</p>
      </div>

      <span
        className={clsx(
          'rounded-full px-3 py-1 text-xs font-semibold',
          isAvailable ? 'bg-white text-emerald-700' : 'bg-white text-red-600'
        )}
      >
        {isAvailable ? 'Book slot' : 'Booked'}
      </span>
    </button>
  );
}

export default SlotCard;
