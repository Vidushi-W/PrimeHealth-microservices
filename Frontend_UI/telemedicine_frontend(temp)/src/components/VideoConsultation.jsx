import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5003';

export default function VideoConsultation({ sessionId, authToken }) {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sessionStatus, setSessionStatus] = useState('connecting');
  const [error, setError] = useState('');
  const jitsiContainerRef = useRef(null);

  useEffect(() => {
    initializeVideo();
    return () => {
      if (window.JitsiMeetExternalAPI) {
        try {
          const videoMain = document.querySelector('.video-main');
          if (videoMain) {
            videoMain.innerHTML = '';
          }
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }
    };
  }, [sessionId]);

  const initializeVideo = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/telemedicine/sessions/${sessionId}/video-token`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const payload = response?.data?.data || {};
      const jitsiRoom = payload.roomName;
      const jitsiToken = payload.token;

      if (!window.JitsiMeetExternalAPI) {
        setError('Jitsi Meet is not loaded. Please refresh the page.');
        return;
      }

      const options = {
        roomName: jitsiRoom,
        width: '100%',
        height: '100%',
        parentNode: document.querySelector('.video-main'),
        jwt: jitsiToken,
        configOverwrite: {
          startAudioOnly: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableMultipleVideoSources: true,
        },
        interfaceConfigOverwrite: {
          VERTICAL_FILMSTRIP: false,
          SHOW_JITSI_WATERMARK: false,
        },
      };

      const api = new window.JitsiMeetExternalAPI('meet.jitsi.si', options);

      api.addEventListener('videoConferenceJoined', () => {
        setSessionStatus('active');
      });

      api.addEventListener('videoConferenceLeavingByHangUp', () => {
        handleEndCall();
      });

      api.addEventListener('readyToClose', () => {
        handleEndCall();
      });

    } catch (err) {
      setError('Failed to initialize video: ' + (err.response?.data?.message || err.message));
      setSessionStatus('error');
    }
  };

  const toggleVideo = async () => {
    setVideoEnabled(!videoEnabled);
  };

  const toggleAudio = async () => {
    setAudioEnabled(!audioEnabled);
  };

  const handleEndCall = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/telemedicine/sessions/${sessionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSessionStatus('ended');
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  };

  return (
    <div className="video-consultation">
      {error && <div className="error-message">{error}</div>}

      <div className="video-main" ref={jitsiContainerRef}>
        <div className="video-no-stream">
          {sessionStatus === 'connecting' && 'Connecting...'}
          {sessionStatus === 'error' && 'Connection failed'}
          {sessionStatus === 'ended' && 'Consultation ended'}
        </div>
      </div>

      {sessionStatus === 'active' && (
        <div className="video-controls">
          <button 
            className={`video-control-btn ${!videoEnabled ? 'off' : ''}`}
            onClick={toggleVideo}
            title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            📷
          </button>
          <button 
            className={`video-control-btn ${!audioEnabled ? 'off' : ''}`}
            onClick={toggleAudio}
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            🎙️
          </button>
          <button 
            className="video-control-btn off"
            onClick={handleEndCall}
            title="End consultation"
          >
            📞
          </button>
        </div>
      )}

      <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        Status: {sessionStatus}
      </div>
    </div>
  );
}
