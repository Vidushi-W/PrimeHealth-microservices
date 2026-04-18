import clsx from '../utils/clsx';

function SlotCard({ slot, onBook, onToggleStatus, onEdit, onDelete, disabled }) {
  const isAvailable = slot.status === 'available';

  return (
    <div
      className={clsx(
        'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
        isAvailable
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-700',
        disabled && 'opacity-60'
      )}
    >
      <div>
        <p className="text-sm font-semibold">
          {slot.start} - {slot.end}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em]">{slot.status}</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleStatus?.(slot)}
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"
        >
          {isAvailable ? 'Mark booked' : 'Mark available'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEdit?.(slot)}
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete?.(slot)}
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default SlotCard;
