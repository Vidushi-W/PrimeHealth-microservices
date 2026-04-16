import { useEffect, useState } from 'react';
import { createReminder, deleteReminder, getReminders, markReminderDone, updateReminder } from '../services/patientApi';
import './Dashboard.css';

const initialForm = {
  type: 'medication',
  title: '',
  description: '',
  date: '',
  time: '',
  repeat: 'once',
  status: 'upcoming',
  medicineName: '',
  dosage: '',
  frequency: '',
  doctorName: '',
  hospitalName: '',
};

function ReminderCard({ reminder, onDelete, onEdit, onMarkDone }) {
  return (
    <article className="list-card" key={reminder.id}>
      <div className="list-card-main">
        <div className="list-card-heading">
          <div>
            <h3>{reminder.title}</h3>
            <p>{reminder.description || (reminder.type === 'medication' ? reminder.medicineName : reminder.doctorName) || 'Reminder details saved'}</p>
          </div>
          <span className={`status-badge ${reminder.status === 'done' ? 'good' : 'neutral'}`}>{reminder.status}</span>
        </div>

        <div className="appointment-details">
          <span>{reminder.type}</span>
          <span>{reminder.dateTimeLabel}</span>
          <span>{reminder.repeat}</span>
          {reminder.type === 'medication' && reminder.dosage ? <span>{reminder.dosage}</span> : null}
          {reminder.type === 'appointment' && reminder.hospitalName ? <span>{reminder.hospitalName}</span> : null}
        </div>
      </div>

      <div className="list-meta">
        <button className="btn btn-secondary small" onClick={() => onEdit(reminder)} type="button">
          Edit
        </button>
        {reminder.status !== 'done' ? (
          <button className="btn btn-primary small" onClick={() => onMarkDone(reminder.id)} type="button">
            Mark as done
          </button>
        ) : null}
        <button className="btn btn-secondary small btn-delete" onClick={() => onDelete(reminder.id)} type="button">
          Delete
        </button>
      </div>
    </article>
  );
}

function ReminderSection({ title, description, reminders, emptyLabel, onDelete, onEdit, onMarkDone }) {
  return (
    <section className="dashboard-section glass">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="list-stack">
        {reminders.length ? reminders.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            onDelete={onDelete}
            onEdit={onEdit}
            onMarkDone={onMarkDone}
            reminder={reminder}
          />
        )) : <p className="list-empty">{emptyLabel}</p>}
      </div>
    </section>
  );
}

function RemindersPage({ auth }) {
  const [form, setForm] = useState(initialForm);
  const [editingReminderId, setEditingReminderId] = useState('');
  const [reminderGroups, setReminderGroups] = useState({ reminders: [], upcoming: [], today: [], completed: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadReminders = async () => {
    const response = await getReminders(auth.token);
    setReminderGroups({
      reminders: response.reminders || [],
      upcoming: response.upcoming || [],
      today: response.today || [],
      completed: response.completed || [],
    });
  };

  useEffect(() => {
    let active = true;

    async function fetchReminders() {
      setIsLoading(true);
      setError('');

      try {
        const response = await getReminders(auth.token);
        if (!active) {
          return;
        }

        setReminderGroups({
          reminders: response.reminders || [],
          upcoming: response.upcoming || [],
          today: response.today || [],
          completed: response.completed || [],
        });
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchReminders();

    return () => {
      active = false;
    };
  }, [auth.token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingReminderId('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (editingReminderId) {
        await updateReminder(auth.token, editingReminderId, form);
        setSuccess('Reminder updated successfully.');
      } else {
        await createReminder(auth.token, form);
        setSuccess('Reminder created successfully.');
      }

      await loadReminders();
      resetForm();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminderId(reminder.id);
    setForm({
      type: reminder.type,
      title: reminder.title,
      description: reminder.description || '',
      date: reminder.date,
      time: reminder.time,
      repeat: reminder.repeat,
      status: reminder.status,
      medicineName: reminder.medicineName || '',
      dosage: reminder.dosage || '',
      frequency: reminder.frequency || '',
      doctorName: reminder.doctorName || '',
      hospitalName: reminder.hospitalName || '',
    });
    setSuccess('');
    setError('');
  };

  const handleDelete = async (reminderId) => {
    const confirmed = window.confirm('Delete this reminder?');
    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await deleteReminder(auth.token, reminderId);
      await loadReminders();
      if (editingReminderId === reminderId) {
        resetForm();
      }
      setSuccess('Reminder deleted successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleMarkDone = async (reminderId) => {
    setError('');
    setSuccess('');

    try {
      await markReminderDone(auth.token, reminderId);
      await loadReminders();
      setSuccess('Reminder marked as done.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (isLoading) {
    return <div className="dashboard-state glass">Loading reminders...</div>;
  }

  return (
    <div className="dashboard animate-fade-in">
      <section className="welcome-card glass">
        <div>
          <p className="eyebrow">Reminders</p>
          <h1>Stay on top of medications and appointments.</h1>
          <p>Create reminders, track what is due today, and mark completed items as you go.</p>
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>{editingReminderId ? 'Edit reminder' : 'Add reminder'}</h2>
            <p>Create medication or appointment reminders even before email or SMS notifications are added.</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="booking-filter-grid">
            <label className="form-field">
              <span>Reminder type</span>
              <select name="type" onChange={handleChange} value={form.type}>
                <option value="medication">Medication</option>
                <option value="appointment">Appointment</option>
              </select>
            </label>

            <label className="form-field">
              <span>Title</span>
              <input name="title" onChange={handleChange} value={form.title} />
            </label>

            <label className="form-field">
              <span>Date</span>
              <input name="date" onChange={handleChange} type="date" value={form.date} />
            </label>

            <label className="form-field">
              <span>Time</span>
              <input name="time" onChange={handleChange} type="time" value={form.time} />
            </label>

            <label className="form-field">
              <span>Repeat</span>
              <select name="repeat" onChange={handleChange} value={form.repeat}>
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>

            <label className="form-field">
              <span>Status</span>
              <select name="status" onChange={handleChange} value={form.status}>
                <option value="upcoming">Upcoming</option>
                <option value="done">Done</option>
                <option value="missed">Missed</option>
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Description or note</span>
            <textarea className="symptom-textarea" name="description" onChange={handleChange} value={form.description} />
          </label>

          {form.type === 'medication' ? (
            <div className="booking-filter-grid">
              <label className="form-field">
                <span>Medicine name</span>
                <input name="medicineName" onChange={handleChange} value={form.medicineName} />
              </label>
              <label className="form-field">
                <span>Dosage</span>
                <input name="dosage" onChange={handleChange} placeholder="500 mg" value={form.dosage} />
              </label>
              <label className="form-field">
                <span>Frequency</span>
                <input name="frequency" onChange={handleChange} placeholder="Twice a day" value={form.frequency} />
              </label>
            </div>
          ) : (
            <div className="booking-filter-grid">
              <label className="form-field">
                <span>Doctor name</span>
                <input name="doctorName" onChange={handleChange} value={form.doctorName} />
              </label>
              <label className="form-field">
                <span>Hospital</span>
                <input name="hospitalName" onChange={handleChange} value={form.hospitalName} />
              </label>
            </div>
          )}

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <div className="booking-actions">
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? (editingReminderId ? 'Saving...' : 'Creating...') : (editingReminderId ? 'Save changes' : 'Add reminder')}
            </button>
            <button className="btn btn-secondary" onClick={resetForm} type="button">
              {editingReminderId ? 'Cancel edit' : 'Clear'}
            </button>
          </div>
        </form>
      </section>

      <ReminderSection
        description="Reminders scheduled for today so you can act on them quickly."
        emptyLabel="No reminders scheduled for today."
        onDelete={handleDelete}
        onEdit={handleEdit}
        onMarkDone={handleMarkDone}
        reminders={reminderGroups.today}
        title="Today's reminders"
      />

      <ReminderSection
        description="Future reminders that are still coming up."
        emptyLabel="No upcoming reminders right now."
        onDelete={handleDelete}
        onEdit={handleEdit}
        onMarkDone={handleMarkDone}
        reminders={reminderGroups.upcoming}
        title="Upcoming reminders"
      />

      <ReminderSection
        description="Completed reminders kept here for quick reference."
        emptyLabel="No completed reminders yet."
        onDelete={handleDelete}
        onEdit={handleEdit}
        onMarkDone={handleMarkDone}
        reminders={reminderGroups.completed}
        title="Completed reminders"
      />
    </div>
  );
}

export default RemindersPage;
