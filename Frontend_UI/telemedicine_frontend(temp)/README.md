# PrimeHealth Telemedicine Frontend

A modern, patient and healthcare provider-friendly web application for online medical consultations, built with React + Vite.

## Features

- ✅ **Video Consultations** - Jitsi Meet integration for high-quality video calls
- ✅ **Real-time Chat** - Socket.IO powered instant messaging before, during, and after consultations
- ✅ **File Sharing** - Securely upload and download medical files (up to 50MB)
- ✅ **Live Note-Taking** - Doctors can create clinical notes with auto-save functionality
- ✅ **Session Management** - Schedule, join, and track consultation sessions
- ✅ **User Roles** - Separate interfaces for patients and healthcare providers
- ✅ **Authentication** - JWT-based secure login
- ✅ **Responsive Design** - Works seamlessly on desktop and mobile devices

## Project Structure

```
src/
├── App.jsx                    # Main app component with routing
├── main.jsx                   # React entry point
├── styles.css                 # Global styles
└── components/
    ├── SessionManager.jsx     # Session listing and scheduling
    ├── VideoConsultation.jsx  # Video call interface
    ├── ChatWindow.jsx         # Real-time messaging
    ├── FileSharing.jsx        # File upload/download
    └── NoteTaking.jsx         # Clinical note editor
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Running telemedicine backend service (port 5003)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment (optional, uses defaults):
```bash
# Backend API will connect to http://localhost:5003
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Output files will be in the `dist/` folder.

## Usage

### For Patients

1. **Login** with your patient credentials
2. **View Sessions** - See your scheduled consultations
3. **Join Session** - Click "Join Consultation" when doctor starts the session
4. **During Consultation:**
   - Join video call
   - Send messages through chat
   - Share medical documents/images
5. **After Consultation** - View session details and download reports

### For Healthcare Providers

1. **Login** with your provider credentials
2. **View Sessions** - See scheduled patient consultations
3. **Start Consultation** - Click "Start Consultation" at the scheduled time
4. **During Consultation:**
   - Video call with patient
   - Chat with patient in real-time
   - View and download patient files
   - Take clinical notes
5. **Submit Notes** - Save clinical documentation after consultation

## API Integration

Frontend communicates with the telemedicine backend API:

### Session Endpoints
- `GET /sessions/patient` - Get patient's sessions
- `GET /sessions/doctor` - Get doctor's sessions
- `GET /sessions/:id/token` - Get Jitsi video token
- `POST /sessions/:id/start` - Start consultation
- `POST /sessions/:id/end` - End consultation

### Chat Endpoints
- `GET /sessions/:id/chat` - Fetch chat messages
- `POST /sessions/:id/chat` - Send message

### File Endpoints
- `GET /sessions/:id/files` - List session files
- `POST /sessions/:id/files/upload` - Upload file
- `GET /sessions/:id/files/:fileId/download` - Download file
- `DELETE /sessions/:id/files/:fileId` - Delete file

### Note Endpoints
- `GET /sessions/:id/notes` - Get session notes
- `POST /sessions/:id/notes` - Save note draft
- `POST /sessions/:id/notes/submit` - Submit final notes

## Dependencies

- **react** (18.3.1) - UI framework
- **react-dom** (18.3.1) - DOM rendering
- **socket.io-client** (4.7.2) - Real-time communication
- **axios** (1.7.9) - HTTP client
- **vite** (5.4.10) - Build tool
- **@vitejs/plugin-react** (4.3.4) - React support for Vite

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern iOS/Android browsers

## Configuration

### Backend URL
Update the proxy configuration in `vite.config.js`:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5003',  // Change this
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### Jitsi Meet Server
The frontend uses meet.jitsi.si by default. To use a custom Jitsi server:

1. Update the Jitsi domain in `VideoConsultation.jsx`
2. Configure JWT tokens for authentication

## Performance Optimization

- Lazy component loading
- Efficient re-rendering with React hooks
- Auto-save functionality for notes (30s interval)
- Session auto-refresh (10s interval)

## Security

- JWT authentication on all API calls
- CORS enabled for backend communication
- Secure WebSocket connections
- File upload validation (type, size)
- No sensitive data in localStorage (only auth token)

## Troubleshooting

### Video not working
- Check if Jitsi Meet library is loaded
- Ensure camera/microphone permissions are granted
- Verify backend is running and accessible

### Chat not connecting
- Check WebSocket connection in browser console
- Ensure CORS is properly configured
- Verify authentication token is valid

### File upload fails
- Check file size (max 50MB)
- Ensure backend upload folder has write permissions
- Verify MIME type is supported

## Future Enhancements

- Screen sharing during consultations
- Video recording functionality
- E-end-to-end message encryption
- Video transcription
- Multi-language support
- Mobile app version
- Dark mode interface
- Advanced appointment scheduling

## Support

For issues or feature requests, contact the development team.

## License

Proprietary - PrimeHealth Microservices Platform
