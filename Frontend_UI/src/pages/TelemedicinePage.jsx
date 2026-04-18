import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  cancelTelemedicineSession,
  createTelemedicineSession,
  endTelemedicineSession,
  fetchAppointmentById,
  fetchTelemedicineSessionById,
  fetchTelemedicineSessions,
  joinTelemedicineSession,
  startTelemedicineSession
} from '../services/platformApi';

const API_BASE_URL = import.meta.env.VITE_TELEMEDICINE_API_URL || 'http://localhost:5006';

function authHeaders(authOrToken) {
  if (typeof authOrToken === 'string') {
    return { Authorization: `Bearer ${authOrToken}` };
  }

  const auth = authOrToken || {};
  const user = auth.user || {};
  const headers = {};

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  if (user.userId || user.id || user._id) {
    headers['x-user-id'] = user.userId || user.id || user._id;
  }
  if (user.role) {
    headers['x-user-role'] = String(user.role).toUpperCase();
  }
  if (user.email) {
    headers['x-user-email'] = user.email;
  }
  if (user.uniqueId) {
    headers['x-user-unique-id'] = user.uniqueId;
  }

  return headers;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('video');
  const [lifecycleWorkingId, setLifecycleWorkingId] = useState('');
  const [search, setSearch] = useState('');
  const [deepLinkPreparing, setDeepLinkPreparing] = useState(false);
  const sessionCreateInFlightRef = useRef(null);
  const sessionCreateFailedForRef = useRef('');

  const appointmentIdFromRoute = String(searchParams.get('appointmentId') || '').trim();
  const role = String(auth?.user?.role || '').toLowerCase();
  const isDeepLink = Boolean(appointmentIdFromRoute);

  const refreshSessions = useCallback(async () => {
    try {
      setLoading(true);
      const allSessions = await fetchTelemedicineSessions(auth);
      const filtered = filter === 'all'
        ? allSessions
        : allSessions.filter((session) => String(session.status || '').toLowerCase() === filter);
      setSessions(filtered || []);
      setError('');
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Failed to load sessions';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [auth, filter]);

  useEffect(() => {
    refreshSessions();
    const interval = window.setInterval(refreshSessions, 10000);
    return () => window.clearInterval(interval);
  }, [refreshSessions]);

  /** Faster refresh while patient waits for doctor-created session */
  useEffect(() => {
    if (role !== 'patient' || !appointmentIdFromRoute) {
      return undefined;
    }
    const fast = window.setInterval(() => {
      refreshSessions();
    }, 4000);
    return () => window.clearInterval(fast);
  }, [role, appointmentIdFromRoute, refreshSessions]);

  useEffect(() => {
    sessionCreateFailedForRef.current = '';
  }, [appointmentIdFromRoute]);

  useEffect(() => {
    if (!appointmentIdFromRoute || loading) {
      return;
    }

    const existing = sessions.find((session) => String(session.appointmentId || '') === appointmentIdFromRoute);
    if (existing) {
      setDeepLinkPreparing(false);
      sessionCreateInFlightRef.current = null;
      setActiveSession((current) => {
        if (String(current?.id || '') === String(existing.id || '')) {
          return current;
        }
        return existing;
      });
      setActiveTab('video');
      return;
    }

    if (sessionCreateInFlightRef.current === appointmentIdFromRoute) {
      return;
    }

    if (sessionCreateFailedForRef.current === appointmentIdFromRoute) {
      return;
    }

    let cancelled = false;
    sessionCreateInFlightRef.current = appointmentIdFromRoute;
    setDeepLinkPreparing(true);

    const ensureSessionForAppointment = async () => {
      try {
        const appointment = await fetchAppointmentById(auth, appointmentIdFromRoute);
        if (!appointment) {
          throw new Error('Appointment not found for telemedicine session');
        }

        const date = String(appointment.appointmentDate || '').slice(0, 10);
        const start = String(appointment.startTime || '00:00').slice(0, 5);
        const end = String(appointment.endTime || appointment.startTime || '00:15').slice(0, 5);

        const created = await createTelemedicineSession(auth, {
          appointmentId: appointmentIdFromRoute,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          provider: 'jitsi',
          scheduledStartAt: `${date}T${start}:00.000Z`,
          scheduledEndAt: `${date}T${end}:00.000Z`
        });

        if (cancelled) {
          return;
        }

        toast.success('Telemedicine session is ready for this appointment');
        if (created) {
          setActiveSession(created);
          setActiveTab('video');
        }
        await refreshSessions();
      } catch (errorEnsuring) {
        if (!cancelled) {
          sessionCreateFailedForRef.current = appointmentIdFromRoute;
          const message = errorEnsuring.response?.data?.message || errorEnsuring.message || 'Unable to prepare telemedicine session for this appointment';
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setDeepLinkPreparing(false);
          sessionCreateInFlightRef.current = null;
        }
      }
    };

    ensureSessionForAppointment();

    return () => {
      cancelled = true;
    };
  }, [appointmentIdFromRoute, loading, sessions, auth, refreshSessions]);

  const metrics = useMemo(() => {
    const live = sessions.filter((session) => session.status === 'live').length;
    const scheduled = sessions.filter((session) => session.status === 'scheduled').length;
    const completed = sessions.filter((session) => session.status === 'completed').length;
    return { live, scheduled, completed };
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const term = search.toLowerCase();
    return sessions.filter((session) => {
      const text = [
        session.id,
        session.appointmentId,
        session.doctorId,
        session.patientId,
        session.status,
        session.provider
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(term);
    });
  }, [sessions, search]);

  const selectSession = (session) => {
    const loadDetails = async () => {
      try {
        const detailed = await fetchTelemedicineSessionById(auth, session.id);
        setActiveSession(detailed || session);
      } catch (_error) {
        setActiveSession(session);
      } finally {
        setActiveTab('video');
      }
    };

    loadDetails();
  };

  const startSession = async (sessionId) => {
    try {
      setLifecycleWorkingId(sessionId);
      const updated = await startTelemedicineSession(auth, sessionId);
      setSessions((current) => current.map((session) => (session.id === sessionId ? updated : session)));
      setActiveSession(updated);
      setActiveTab('video');
      toast.success('Consultation started');
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Failed to start session';
      setError(message);
      toast.error(message);
    } finally {
      setLifecycleWorkingId('');
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      setLifecycleWorkingId(sessionId);
      const updated = await endTelemedicineSession(auth, sessionId);
      setSessions((current) => current.map((session) => (session.id === sessionId ? updated : session)));
      if (String(activeSession?.id) === String(sessionId)) {
        setActiveSession(updated);
      }
      toast.success('Session ended');

      if (role === 'patient' && String(updated?.appointmentId || '').trim()) {
        navigate(`/appointments?payAppointmentId=${encodeURIComponent(updated.appointmentId)}`);
      }
    } catch (errorEnding) {
      toast.error(errorEnding.message || 'Unable to end session');
    } finally {
      setLifecycleWorkingId('');
    }
  };

  const handleCancelSession = async (sessionId) => {
    try {
      setLifecycleWorkingId(sessionId);
      const updated = await cancelTelemedicineSession(auth, sessionId);
      setSessions((current) => current.map((session) => (session.id === sessionId ? updated : session)));
      if (String(activeSession?.id) === String(sessionId)) {
        setActiveSession(updated);
      }
      toast.success('Session cancelled');
    } catch (errorCancelling) {
      toast.error(errorCancelling.message || 'Unable to cancel session');
    } finally {
      setLifecycleWorkingId('');
    }
  };

  const videoWorkspace = activeSession ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Video call</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Session {String(activeSession.id).slice(-6)}</h2>
          <p className="mt-1 text-sm text-slate-500">Appointment {activeSession.appointmentId || 'not linked'} · {activeSession.provider || 'jitsi'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-secondary" onClick={() => setActiveSession(null)}>Back to sessions</button>
        </div>
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

      {activeTab === 'video' ? (
        <VideoConsultation sessionId={activeSession.id} authContext={auth} viewerRole={role} onSessionUpdate={setActiveSession} />
      ) : null}
      {activeTab === 'chat' ? <ChatWindow sessionId={activeSession.id} authContext={auth} userId={auth.user?.userId || auth.user?._id || auth.user?.id} /> : null}
      {activeTab === 'details' ? <SessionDetails session={activeSession} /> : null}
    </div>
  ) : (
    <div className="grid min-h-[min(85vh,52rem)] place-items-center rounded-[1.5rem] border border-dashed border-brand-200 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 p-8 text-center text-white shadow-soft">
      <div className="max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-200">Video room</p>
        <h2 className="mt-3 text-2xl font-black tracking-tight">
          {deepLinkPreparing || loading
            ? 'Preparing your consultation…'
            : role === 'patient' && isDeepLink
              ? 'Waiting for your doctor…'
              : 'Choose a session to join'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          {deepLinkPreparing || loading
            ? 'We are linking this appointment to a secure Jitsi room. Your camera and microphone will start here in a moment—same idea as Google Meet or Teams.'
            : role === 'patient' && isDeepLink
              ? 'Your clinician opens the video room first. This page refreshes every few seconds—once the room is ready, the video will appear automatically.'
              : 'Pick this appointment’s session from the list below (View session / Join now), or open the link again after the doctor has started the visit.'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-up">
      {isDeepLink ? (
        <section className="panel overflow-hidden p-5 shadow-soft lg:p-6">
          {videoWorkspace}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-soft">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-600">Telemedicine hub</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Real-time consultation workspace.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Open your appointment session and connect instantly. Video opens in the workspace when you select a live session or follow an appointment link.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="badge-soft">Sessions</span>
              <span className="badge-soft">Jitsi video</span>
              <span className="badge-soft">Secure chat</span>
              <span className="badge-soft">JWT when configured</span>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] bg-brand-50 p-6 text-slate-900 shadow-soft sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MetricCard label="Live" value={metrics.live} accent="text-emerald-700" />
            <MetricCard label="Scheduled" value={metrics.scheduled} accent="text-amber-700" />
            <MetricCard label="Completed" value={metrics.completed} accent="text-sky-700" />
          </div>
        </div>
      </section>

      <section className={`grid gap-6 ${isDeepLink ? 'xl:grid-cols-1' : 'xl:grid-cols-[0.94fr_1.06fr]'}`}>
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
          <div className="mt-4">
            <input
              className="input max-w-sm"
              placeholder="Search by session ID, appointment, doctor, or patient"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-5 space-y-3">
            {loading && sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">Loading telemedicine sessions...</div>
            ) : null}

            {!loading && visibleSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">No sessions found for this filter.</div>
            ) : null}

            {visibleSessions.map((session) => {
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
                    {session.status === 'live' ? (
                      <button type="button" className="button-primary" onClick={() => selectSession(session)}>Join now</button>
                    ) : null}
                    {session.status === 'live' ? (
                      <button type="button" className="button-secondary" disabled={lifecycleWorkingId === session.id} onClick={() => handleEndSession(session.id)}>End session</button>
                    ) : null}
                    {session.status === 'scheduled' && role !== 'patient' ? (
                      <button type="button" className="button-secondary" disabled={lifecycleWorkingId === session.id} onClick={() => handleCancelSession(session.id)}>Cancel session</button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {!isDeepLink ? (
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

                {activeTab === 'video' ? (
                  <VideoConsultation
                    sessionId={activeSession.id}
                    authContext={auth}
                    viewerRole={role}
                    onSessionUpdate={setActiveSession}
                  />
                ) : null}
                {activeTab === 'chat' ? <ChatWindow sessionId={activeSession.id} authContext={auth} userId={auth.user?.userId || auth.user?._id || auth.user?.id} /> : null}
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
        ) : null}
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

function VideoConsultation({ sessionId, authContext, viewerRole = '', onSessionUpdate }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [waitingForPeer, setWaitingForPeer] = useState(true);
  const [participantCount, setParticipantCount] = useState(1);
  const [waitHint, setWaitHint] = useState('');

  const isPatientViewer = String(viewerRole || '').toLowerCase() === 'patient';

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const mountJitsi = async () => {
      try {
        setError('');
        setWaitHint('');

        if (!window.JitsiMeetExternalAPI) {
          throw new Error('Jitsi Meet is not loaded. Refresh the page and try again.');
        }

        while (!cancelled) {
          try {
            setStatus('connecting');
            setWaitHint('');

            const joined = await joinTelemedicineSession(authContext, sessionId);
            onSessionUpdate?.(joined);

            const response = await axios.post(`${API_BASE_URL}/telemedicine/sessions/${sessionId}/video-token`, {}, {
              headers: authHeaders(authContext)
            });

            if (cancelled) return;

            const payload = response.data?.data || {};
            const roomName = payload.roomName;
            const token = payload.token || null;
            let domain = 'meet.jit.si';
            try {
              if (payload.roomUrl) {
                domain = new URL(payload.roomUrl).hostname;
              }
            } catch (_parseError) {
              domain = 'meet.jit.si';
            }

            if (containerRef.current) {
              containerRef.current.innerHTML = '';
            }

            const jitsiOptions = {
              roomName,
              width: '100%',
              height: '100%',
              parentNode: containerRef.current,
              configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                disableDeepLinking: true,
                prejoinPageEnabled: false
              },
              interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_BRAND_WATERMARK: false,
                VERTICAL_FILMSTRIP: false
              }
            };
            if (token) {
              jitsiOptions.jwt = token;
            }

            apiRef.current = new window.JitsiMeetExternalAPI(domain, jitsiOptions);

            apiRef.current.addEventListener('videoConferenceJoined', () => {
              setStatus('active');
              setWaitingForPeer(true);
              setParticipantCount(1);
            });
            apiRef.current.addEventListener('participantJoined', () => {
              setParticipantCount((current) => {
                const next = current + 1;
                if (next >= 2) {
                  setWaitingForPeer(false);
                }
                return next;
              });
            });
            apiRef.current.addEventListener('participantLeft', () => {
              setParticipantCount((current) => {
                const next = Math.max(1, current - 1);
                if (next < 2) {
                  setWaitingForPeer(true);
                }
                return next;
              });
            });
            apiRef.current.addEventListener('readyToClose', () => setStatus('ended'));
            return;
          } catch (requestError) {
            const code = requestError.response?.data?.code;
            const waiting = code === 'WAITING_FOR_DOCTOR';
            if (isPatientViewer && waiting && !cancelled) {
              setStatus('waiting_doctor');
              setWaitHint(requestError.response?.data?.message || 'Waiting for your doctor to join…');
              await sleep(4000);
              continue;
            }
            const message = requestError.response?.data?.message || requestError.message || 'Failed to initialize video';
            setError(message);
            setStatus('error');
            toast.error(message);
            return;
          }
        }
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
  }, [authContext, sessionId, onSessionUpdate, isPatientViewer]);

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
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-soft ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
            <span className="font-semibold">In-call video</span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
              {status === 'active' ? 'Connected' : status === 'waiting_doctor' ? 'Waiting for doctor' : status}
            </span>
          </div>
          <div className="relative min-h-[min(85vh,52rem)] bg-slate-900">
            <div ref={containerRef} className="min-h-[min(85vh,52rem)] w-full" />
            {status === 'waiting_doctor' ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/92 px-6 text-center text-white">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-200">Almost there</p>
                <p className="max-w-md text-sm text-white/90">{waitHint || 'Your doctor will open the video room first. Retrying…'}</p>
              </div>
            ) : null}
            {waitingForPeer && status === 'active' ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/10 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-200">Waiting for others</p>
                <p className="mt-1 text-sm text-white/90">You are in the room. When your clinician or patient joins, they will appear here.</p>
                <p className="mt-1 text-xs text-white/60">Participants: {participantCount}</p>
              </div>
            ) : null}
          </div>
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

function ChatWindow({ sessionId, authContext, userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/telemedicine/chat/${sessionId}/messages`, {
        headers: authHeaders(authContext)
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
        headers: authHeaders(authContext)
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
