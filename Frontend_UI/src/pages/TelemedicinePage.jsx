import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_TELEMEDICINE_API_URL || 'http://localhost:5006';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function formatDateTime(value) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleString();
}

function statusTone(status) {
  switch (status) {
    case 'live':
      return 'bg-emerald-100 text-emerald-700';
    case 'completed':
      return 'bg-slate-100 text-slate-600';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

export default function TelemedicinePage({ auth }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('video');

  const refreshSessions = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? undefined : { status: filter };
      const response = await axios.get(`${API_BASE_URL}/telemedicine/sessions`, {
        params,
        headers: authHeaders(auth.token)
      });
      setSessions(response.data?.data || []);
      setError('');
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Failed to load sessions';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSessions();
    const interval = window.setInterval(refreshSessions, 10000);
    return () => window.clearInterval(interval);
  }, [filter]);

  const metrics = useMemo(() => {
    const live = sessions.filter((session) => session.status === 'live').length;
    const scheduled = sessions.filter((session) => session.status === 'scheduled').length;
    const completed = sessions.filter((session) => session.status === 'completed').length;
    return { live, scheduled, completed };
  }, [sessions]);

  const selectSession = (session) => {
    setActiveSession(session);
    setActiveTab('video');
  };

  const startSession = async (sessionId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/telemedicine/sessions/${sessionId}/start`, {}, {
        headers: authHeaders(auth.token)
      });
      const updated = response.data?.data;
      setSessions((current) => current.map((session) => (session.id === sessionId ? updated : session)));
      setActiveSession(updated);
      setActiveTab('video');
      toast.success('Consultation started');
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Failed to start session';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-soft">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-600">Telemedicine hub</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Real-time consultation workspace.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Live sessions, Jitsi video, and secure chat are wired to the telemedicine service. Select a session to join or start it when you are the assigned doctor.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="badge-soft">Sessions</span>
              <span className="badge-soft">Jitsi video</span>
              <span className="badge-soft">Secure chat</span>
              <span className="badge-soft">JWT-authenticated</span>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] bg-brand-50 p-6 text-slate-900 shadow-soft sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MetricCard label="Live" value={metrics.live} accent="text-emerald-300" />
            <MetricCard label="Scheduled" value={metrics.scheduled} accent="text-amber-300" />
            <MetricCard label="Completed" value={metrics.completed} accent="text-sky-300" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Sessions</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">My consultations</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'scheduled', 'live', 'completed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === status ? 'bg-brand-500 text-white shadow-soft' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}
                >
                  {status[0].toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-5 space-y-3">
            {loading && sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">Loading telemedicine sessions...</div>
            ) : null}

            {!loading && sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">No sessions found for this filter.</div>
            ) : null}

            {sessions.map((session) => {
              const isActive = activeSession?.id === session.id;
              return (
                <article
                  key={session.id}
                  className={`rounded-3xl border p-4 transition ${isActive ? 'border-brand-300 bg-brand-50/60 shadow-soft' : 'border-white/80 bg-white/80 hover:border-brand-200 hover:bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{session.provider || 'jitsi'}</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">Session {String(session.id).slice(-6)}</h3>
                      <p className="mt-1 text-sm text-slate-500">{auth.user?.role === 'doctor' ? `Patient ${session.patientId}` : `Doctor ${session.doctorId}`}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(session.status)}`}>{session.status}</span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Start</p>
                      <p className="mt-1 font-semibold text-slate-800">{formatDateTime(session.scheduledStartAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">End</p>
                      <p className="mt-1 font-semibold text-slate-800">{formatDateTime(session.scheduledEndAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="button-secondary" onClick={() => selectSession(session)}>View session</button>
                    {session.status === 'scheduled' && auth.user?.role === 'doctor' ? (
                      <button type="button" className="button-primary" onClick={() => startSession(session.id)}>Start consultation</button>
                    ) : null}
                    {session.status === 'live' ? (
                      <button type="button" className="button-primary" onClick={() => selectSession(session)}>Join now</button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="panel p-5">
          {activeSession ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Consultation workspace</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Session {String(activeSession.id).slice(-6)}</h2>
                  <p className="mt-1 text-sm text-slate-500">Appointment {activeSession.appointmentId || 'not linked'} · {activeSession.provider || 'jitsi'}</p>
                </div>
                <button type="button" className="button-secondary" onClick={() => setActiveSession(null)}>Back to sessions</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {['video', 'chat', 'details'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-brand-500 text-white shadow-soft' : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}
                  >
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {activeTab === 'video' ? <VideoConsultation sessionId={activeSession.id} authToken={auth.token} /> : null}
              {activeTab === 'chat' ? <ChatWindow sessionId={activeSession.id} authToken={auth.token} userId={auth.user?.userId || auth.user?._id || auth.user?.id} /> : null}
              {activeTab === 'details' ? <SessionDetails session={activeSession} /> : null}
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-[1.5rem] border border-dashed border-brand-100 bg-gradient-to-br from-white to-brand-50/40 p-8 text-center">
              <div className="max-w-md">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">No active session</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Choose a consultation to continue.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">Start with a scheduled session, then switch between video and chat inside the same workspace.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">{label}</p>
      <p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function SessionDetails({ session }) {
  return (
    <div className="grid gap-4 rounded-[1.5rem] border border-brand-100 bg-gradient-to-br from-white to-brand-50/50 p-5 sm:grid-cols-2">
      <Detail label="Doctor" value={session.doctorId} />
      <Detail label="Patient" value={session.patientId} />
      <Detail label="Status" value={session.status} />
      <Detail label="Provider" value={session.provider || 'jitsi'} />
      <Detail label="Scheduled start" value={formatDateTime(session.scheduledStartAt)} />
      <Detail label="Scheduled end" value={formatDateTime(session.scheduledEndAt)} />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-slate-800">{value || 'N/A'}</p>
    </div>
  );
}

function VideoConsultation({ sessionId, authToken }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const mountJitsi = async () => {
      try {
        setStatus('connecting');
        setError('');

        const response = await axios.post(`${API_BASE_URL}/telemedicine/sessions/${sessionId}/video-token`, {}, {
          headers: authHeaders(authToken)
        });

        if (cancelled) return;

        const payload = response.data?.data || {};
        const roomName = payload.roomName;
        const token = payload.token;

        if (!window.JitsiMeetExternalAPI) {
          throw new Error('Jitsi Meet is not loaded. Refresh the page and try again.');
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          jwt: token,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            VERTICAL_FILMSTRIP: false
          }
        });

        apiRef.current.addEventListener('videoConferenceJoined', () => setStatus('active'));
        apiRef.current.addEventListener('readyToClose', () => setStatus('ended'));
      } catch (requestError) {
        const message = requestError.response?.data?.message || requestError.message || 'Failed to initialize video';
        setError(message);
        setStatus('error');
        toast.error(message);
      }
    };

    mountJitsi();

    return () => {
      cancelled = true;
      try {
        apiRef.current?.dispose?.();
      } catch (_error) {
        // best-effort cleanup
      }
      apiRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [authToken, sessionId]);

  const toggleAudio = () => {
    apiRef.current?.executeCommand?.('toggleAudio');
    setAudioEnabled((current) => !current);
  };

  const toggleVideo = () => {
    apiRef.current?.executeCommand?.('toggleVideo');
    setVideoEnabled((current) => !current);
  };

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="overflow-hidden rounded-[1.5rem] border border-brand-100 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3 text-sm text-slate-600">
            <span>Jitsi video room</span>
            <span>Status: {status}</span>
          </div>
          <div ref={containerRef} className="min-h-[30rem] bg-brand-50" />
        </div>

        <div className="rounded-[1.5rem] border border-brand-100 bg-gradient-to-br from-white to-brand-50/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Call controls</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">Live session tools</h3>
          <div className="mt-4 space-y-3">
            <button type="button" className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${audioEnabled ? 'bg-slate-100 text-slate-700 hover:bg-brand-50' : 'bg-brand-500 text-white'}`} onClick={toggleAudio}>
              {audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            </button>
            <button type="button" className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${videoEnabled ? 'bg-slate-100 text-slate-700 hover:bg-brand-50' : 'bg-brand-500 text-white'}`} onClick={toggleVideo}>
              {videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">
            Jitsi credentials are requested from the telemedicine service, so the room remains tied to the session and user token.
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatWindow({ sessionId, authToken, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/telemedicine/chat/${sessionId}/messages`, {
        headers: authHeaders(authToken)
      });
      setMessages(response.data?.data || []);
      setError('');
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Failed to load chat';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = window.setInterval(loadMessages, 7000);
    return () => window.clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;

    setInput('');
    try {
      const response = await axios.post(`${API_BASE_URL}/telemedicine/chat/${sessionId}/messages`, { content }, {
        headers: authHeaders(authToken)
      });
      const created = response.data?.data;
      if (created) {
        setMessages((current) => [...current, created]);
      }
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Failed to send message';
      setError(message);
      setInput(content);
    }
  };

  return (
    <div className="flex h-[34rem] flex-col overflow-hidden rounded-[1.5rem] border border-brand-100 bg-gradient-to-br from-white to-brand-50/40 shadow-soft">
      <div className="border-b border-brand-100 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Secure chat</p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">Session messages</h3>
      </div>

      {error ? <div className="mx-5 mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading ? <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">Loading chat...</div> : null}
        {!loading && messages.length === 0 ? <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">No messages yet. Start the conversation.</div> : null}

        {messages.map((message) => {
          const mine = message.senderId === userId;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${mine ? 'bg-brand-500 text-white' : 'bg-white text-slate-700'}`}>
                <p className="text-sm leading-6">{message.content}</p>
                <p className={`mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                  {formatDateTime(message.sentAt || message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="border-t border-brand-100 bg-white/70 p-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Write a message..."
            className="input flex-1 rounded-full"
          />
          <button type="submit" className="button-primary rounded-full px-6">Send</button>
        </div>
      </form>
    </div>
  );
}
