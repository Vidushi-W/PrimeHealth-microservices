const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Routes
app.post('/api/telemedicine/sessions', (req, res) => {
    const { appointmentId, patientName, doctorName } = req.body;
    
    // Using Jitsi Meet as the third-party provider (no API key needed for basic usage)
    const roomId = `PrimeHealth-${appointmentId || Math.random().toString(36).substring(7)}`;
    const videoLink = `https://meet.jit.si/${roomId}`;

    res.status(201).json({
        success: true,
        message: 'Telemedicine session created',
        appointmentId,
        videoLink,
        roomId
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('Telemedicine Service is healthy');
});

app.listen(PORT, () => {
    console.log(`Telemedicine Service running on port ${PORT}`);
});
