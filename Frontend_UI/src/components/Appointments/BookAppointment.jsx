import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Currently hardcoding the appointment service URL (run via API gateway in production)
const API_URL = import.meta.env.VITE_APPOINTMENT_API || 'http://localhost:5003/api';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Hardcoded patient for this demo module
  const [formData, setFormData] = useState({
    patientId: 'pat_12345',
    patientName: 'John Doe',
    doctorId: 'DOC-1744825946399', // From earlier testing 
    doctorName: 'Dr. Jane Smith',
    appointmentDate: '',
    startTime: '',
    reason: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mocking Auth header for Patient Role
      const response = await axios.post(`${API_URL}/appointments`, formData, {
        headers: {
          'x-user-id': formData.patientId,
          'x-user-role': 'PATIENT'
        }
      });

      if (response.data.success) {
        // Redirect to exact appointment or checkout
        navigate(`/checkout/${response.data.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error booking appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden glass-panel p-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Book an Appointment</h2>
          <p className="text-gray-500">Secure your session with our elite medical professionals.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700 mb-1">Doctor ID</label>
              <input
                type="text"
                name="doctorId"
                id="doctorId"
                value={formData.doctorId}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border"
              />
            </div>
            <div>
              <label htmlFor="doctorName" className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
              <input
                type="text"
                name="doctorName"
                id="doctorName"
                value={formData.doctorName}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border"
              />
            </div>
            <div>
              <label htmlFor="appointmentDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                name="appointmentDate"
                id="appointmentDate"
                value={formData.appointmentDate}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border"
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Time (HH:MM)</label>
              <input
                type="time"
                name="startTime"
                id="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
            <textarea
              name="reason"
              id="reason"
              rows="3"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2 px-3 border"
              placeholder="Briefly describe your symptoms or reason for visit"
            ></textarea>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
