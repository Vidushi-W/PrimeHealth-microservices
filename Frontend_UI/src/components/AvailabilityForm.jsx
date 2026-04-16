import { useState } from 'react';

const initialState = {
  day: 'Monday',
  slotDuration: 30,
  rangeStart: '09:00',
  rangeEnd: '12:00'
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function AvailabilityForm({ onSubmit, submitting }) {
  const [formState, setFormState] = useState(initialState);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: name === 'slotDuration' ? Number(value) : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const shouldReset = await onSubmit?.(formState);
    if (shouldReset) {
      setFormState(initialState);
    }
  };

  return (
    <form className="panel p-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
            Availability Management
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Generate fresh appointment slots</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600">Day</span>
          <select name="day" value={formState.day} onChange={handleChange} className="input">
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600">Slot Duration</span>
          <input
            name="slotDuration"
            type="number"
            min="5"
            step="5"
            value={formState.slotDuration}
            onChange={handleChange}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600">Range Start</span>
          <input
            name="rangeStart"
            type="time"
            value={formState.rangeStart}
            onChange={handleChange}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600">Range End</span>
          <input
            name="rangeEnd"
            type="time"
            value={formState.rangeEnd}
            onChange={handleChange}
            className="input"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          This generates contiguous slots based on the selected duration and time range.
        </p>
        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? 'Generating...' : 'Generate Slots'}
        </button>
      </div>
    </form>
  );
}

export default AvailabilityForm;
