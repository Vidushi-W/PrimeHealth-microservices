import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  createTelemedicineSession,
  fetchAppointmentById,
  fetchTelemedicineSessionById,
  fetchTelemedicineSessions,
  joinTelemedicineSession,
  startTelemedicineSession
} from '../services/platformApi';

function hasDoctorStarted(session) {
  const participants = session?.metadata?.participants || {};
  return Boolean(participants?.doctor?.joinedAt)
    || Boolean(session?.metadata?.doctorHasStarted)
    || String(session?.status || '').toLowerCase() === 'live'
    || String(session?.status || '').toLowerCase() === 'completed';
}

function normalizeMeetRoomName(rawRoomName, fallback) {
  const value = String(rawRoomName || '').trim();
  if (!value) return fallback;
  if (!value.includes('/')) return value;
  const parts = value.split('/').map((p) => String(p || '').trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : fallback;
}

function roomNameFromAppointmentId(appointmentId) {
  const value = String(appointmentId || '').trim().toLowerCase();
  return value ? `primehealth-${value}` : '';
}

function pickBestSessionForAppointment(sessions, appointmentId) {
  const id = String(appointmentId || '').trim();
  const candidates = (Array.isArray(sessions) ? sessions : []).filter(
    (item) => String(item?.appointmentId || '').trim() === id
  );
  if (!candidates.length) return null;

  const rank = (item) => {
    const status = String(item?.status || '').toLowerCase();
    if (hasDoctorStarted(item)) return 3;
    if (status === 'live') return 2;
    if (status === 'scheduled') return 1;
    return 0;
  };

  candidates.sort((a, b) => {
    const r = rank(b) - rank(a);
    if (r !== 0) return r;
    const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return tb - ta;
  });

  return candidates[0];
}

async function ensureMeetJitsiExternalApi() {
  if (window.JitsiMeetExternalAPI) {
    return;
  }

  const scriptSrc = 'https://meet.jit.si/external_api.js';
  const existing = document.querySelector(`script[src="${scriptSrc}"]`);

  if (existing) {
    await new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi API script.')), { once: true });
    });
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Jitsi API script.'));
    document.head.appendChild(script);
  });
}

function MeetingView({ sessionId, authContext, viewerRole, forcedRoomName = '' }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const isPatient = String(viewerRole || '').toLowerCase() === 'patient';

  useEffect(() => {
    let cancelled = false;

    /**
     * Jitsi IFrame (External) API: same `roomName` + domain as Zoom/Google Meet “meeting id”.
     * @see https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
     */
    const mountJitsi = async () => {
      try {
        setError('');
        setStatus('connecting');

        let session = null;
        if (!forcedRoomName) {
          session = await fetchTelemedicineSessionById(authContext, sessionId);
          if (cancelled) return;
        }

        const fallbackRoom = forcedRoomName || `primehealth-${String(sessionId || '').trim()}`;
        const roomName = normalizeMeetRoomName(forcedRoomName || session?.roomName, fallbackRoom);
        if (!roomName) {
          throw new Error('Meeting room is unavailable for this session.');
        }

        const domain = 'meet.jit.si';
        await ensureMeetJitsiExternalApi();
        if (!window.JitsiMeetExternalAPI) {
          throw new Error('Jitsi Meet API is unavailable for this domain.');
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const u = authContext?.user || {};
        const displayName = String(
          u.fullName || u.name || u.email || (isPatient ? 'Patient' : 'Clinician')
        ).trim() || 'Guest';

        const jitsiOptions = {
          roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: {
            displayName,
            ...(u.email ? { email: String(u.email) } : {})
          },
          configOverwrite: {
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            prejoinConfig: {
              enabled: false
            }
          }
        };

        apiRef.current = new window.JitsiMeetExternalAPI(domain, jitsiOptions);

        try {
          apiRef.current.executeCommand?.('displayName', displayName);
        } catch (_cmdErr) {
          // displayName via userInfo is preferred; command is a fallback on some builds
        }

        apiRef.current.addEventListener('videoConferenceJoined', () => {
          setStatus('active');
        });
        apiRef.current.addEventListener('readyToClose', () => setStatus('ended'));
      } catch (requestError) {
        if (cancelled) return;
        const message = requestError.response?.data?.message || requestError.message || 'Failed to initialize Jitsi meeting';
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
  }, [authContext, sessionId, isPatient, forcedRoomName]);

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-soft ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
          <span className="font-semibold">Consultation video</span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
            {status === 'active' ? 'In call' : status === 'connecting' ? 'Connecting…' : status === 'waiting' ? 'Waiting for doctor' : status}
          </span>
        </div>
        <div className="h-[min(85vh,52rem)] bg-slate-900">
          <div ref={containerRef} className="h-[min(85vh,52rem)] w-full" />
        </div>
      </div>
    </div>
  );
}

export default function TelemedicinePage({ auth }) {
  const [searchParams] = useSearchParams();
  const appointmentId = String(searchParams.get('appointmentId') || '').trim();
  const role = String(auth?.user?.role || '').toLowerCase();
  const authToken = String(auth?.token || '');
  const authUserId = String(auth?.user?.userId || auth?.user?.id || auth?.user?._id || '');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [forcedRoomName, setForcedRoomName] = useState('');
  const pollingRef = useRef(null);
  const notifiedDoctorLiveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const clearPolling = () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const tryJoinAsPatient = async (targetSession) => {
      try {
        const joined = await joinTelemedicineSession(auth, targetSession.id);
        if (!cancelled) {
          setSession(joined || targetSession);
          setWaiting(false);
          setError('');
          clearPolling();
        }
      } catch (joinError) {
        const code = joinError?.response?.data?.code || '';
        if (code === 'WAITING_FOR_DOCTOR') {
          if (!cancelled) {
            setWaiting(true);
            setError('');
            const deterministicRoom = roomNameFromAppointmentId(appointmentId);
            if (deterministicRoom) {
              setForcedRoomName(deterministicRoom);
            }
          }
          return;
        }
        throw joinError;
      }
    };

    const init = async () => {
      try {
        setLoading(true);
        setError('');
        setWaiting(false);
        setForcedRoomName('');

        if (!appointmentId) {
          throw new Error('Open telemedicine from an appointment card to start the meeting.');
        }

        const list = await fetchTelemedicineSessions(auth).catch(() => []);
        let target = pickBestSessionForAppointment(list, appointmentId);

        if (!target) {
          if (role !== 'doctor') {
            const deterministicRoom = roomNameFromAppointmentId(appointmentId);
            if (deterministicRoom) {
              setForcedRoomName(deterministicRoom);
            }
            setWaiting(true);
            setError('');
            setLoading(false);
            if (!pollingRef.current) {
              pollingRef.current = window.setInterval(async () => {
                const latest = await fetchTelemedicineSessions(auth).catch(() => []);
                const found = pickBestSessionForAppointment(latest, appointmentId);
                if (found) {
                  setSession(found);
                  if (hasDoctorStarted(found)) {
                    await tryJoinAsPatient(found).catch(() => null);
                  }
                }
              }, 3000);
            }
            return;
          }

          const appointment = await fetchAppointmentById(auth, appointmentId);
          if (!appointment) {
            throw new Error('Appointment not found.');
          }
          const date = String(appointment.appointmentDate || '').slice(0, 10);
          const start = String(appointment.startTime || '00:00').slice(0, 5);
          const end = String(appointment.endTime || appointment.startTime || '00:15').slice(0, 5);

          target = await createTelemedicineSession(auth, {
            appointmentId,
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            provider: 'jitsi',
            scheduledStartAt: `${date}T${start}:00.000Z`,
            scheduledEndAt: `${date}T${end}:00.000Z`
          });
        }

        if (!target?.id) {
          throw new Error('Unable to prepare meeting session.');
        }

        if (role === 'doctor') {
          const started = await startTelemedicineSession(auth, target.id);
          if (!cancelled) {
            setSession(started || target);
            setWaiting(false);
          }
          return;
        }

        await tryJoinAsPatient(target);
        if (!cancelled && !hasDoctorStarted(target)) {
          setWaiting(true);
          const deterministicRoom = roomNameFromAppointmentId(appointmentId);
          if (deterministicRoom) {
            // Fallback: join deterministic room directly when backend presence sync lags.
            setForcedRoomName(deterministicRoom);
          }
          if (!pollingRef.current) {
            pollingRef.current = window.setInterval(async () => {
              const latestList = await fetchTelemedicineSessions(auth).catch(() => []);
              const latest = pickBestSessionForAppointment(latestList, appointmentId);
              if (!latest) return;
              setSession(latest);
              if (hasDoctorStarted(latest)) {
                if (!notifiedDoctorLiveRef.current) {
                  notifiedDoctorLiveRef.current = true;
                  toast.success('Doctor is live now. Joining meeting...');
                }
                await tryJoinAsPatient(latest).catch(() => null);
              }
            }, 3000);
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          const message = requestError?.response?.data?.message || requestError?.message || 'Unable to open meeting.';
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, role, authToken, authUserId]);

  if (loading) {
    return (
      <section className="panel p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Preparing meeting...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      </section>
    );
  }

  if (waiting) {
    if (forcedRoomName) {
      return (
        <section className="panel w-full p-4 lg:p-5">
          <MeetingView
            sessionId={session?.id || appointmentId}
            authContext={auth}
            viewerRole={role}
            forcedRoomName={forcedRoomName}
          />
        </section>
      );
    }
    return (
      <section className="panel p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Waiting for doctor to host the meeting. This page auto-refreshes and will join as soon as the doctor starts.
        </div>
      </section>
    );
  }

  if (!session?.id) {
    return (
      <section className="panel p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Meeting session is not available yet.</div>
      </section>
    );
  }

  return (
    <section className="panel w-full p-4 lg:p-5">
      <MeetingView sessionId={session.id} authContext={auth} viewerRole={role} />
    </section>
  );
}
