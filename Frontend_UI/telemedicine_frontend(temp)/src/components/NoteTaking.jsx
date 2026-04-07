import { useState, useEffect } from 'react';
import axios from 'axios';

export default function NoteTaking({ sessionId, authToken }) {
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, [sessionId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (notes.trim()) {
        handleSaveNotes();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [notes]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(
        `/api/sessions/${sessionId}/notes`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSavedNotes(response.data);
      if (response.data.length > 0) {
        setNotes(response.data[0].content);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;

    setSaving(true);
    try {
      await axios.post(
        `/api/sessions/${sessionId}/notes`,
        { content: notes, category: 'consultation' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setLastSaved(new Date().toLocaleTimeString());
      setError('');
    } catch (err) {
      setError('Failed to save notes: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitNotes = async () => {
    if (!notes.trim()) {
      setError('Notes cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `/api/sessions/${sessionId}/notes/submit`,
        { content: notes },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setLastSaved(new Date().toLocaleTimeString());
      setError('');
      alert('Notes submitted successfully!');
    } catch (err) {
      setError('Failed to submit notes: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleClearNotes = () => {
    if (window.confirm('Clear all notes? This action cannot be undone.')) {
      setNotes('');
    }
  };

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div className="notes-container">
      {error && <div className="error-message">{error}</div>}

      <div className="notes-editor">
        <div className="notes-toolbar">
          <button 
            onClick={handleSaveNotes}
            disabled={saving || !notes.trim()}
            title="Save draft"
          >
            💾 Save Draft
          </button>
          <button 
            onClick={handleSubmitNotes}
            disabled={saving || !notes.trim()}
            title="Submit final notes"
          >
            ✓ Submit Notes
          </button>
          <button 
            onClick={handleClearNotes}
            title="Clear notes"
          >
            🗑️ Clear
          </button>
          {lastSaved && (
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)',
              paddingTop: '0.5rem'
            }}>
              Last saved: {lastSaved}
            </span>
          )}
          {saving && (
            <span style={{ 
              fontSize: '0.85rem', 
              color: 'var(--primary-color)',
              paddingTop: '0.5rem'
            }}>
              Saving...
            </span>
          )}
        </div>

        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Type clinical notes here...

Format suggestions:
- Patient's presenting complaint
- Examination findings
- Diagnosis
- Treatment plan
- Medications prescribed
- Follow-up instructions
- Any relevant medical history"
        />
      </div>

      <div style={{ 
        fontSize: '0.85rem', 
        color: 'var(--text-secondary)',
        marginTop: '1rem'
      }}>
        Word count: {notes.trim().split(/\s+/).filter(w => w).length} | 
        Character count: {notes.length}
      </div>

      {savedNotes.length > 1 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Previous Notes</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {savedNotes.slice(1).map((note, idx) => (
              <div 
                key={idx} 
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {new Date(note.createdAt).toLocaleString()}
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                  {note.content.substring(0, 200)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
