import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const APPOINTMENT_API_URL = import.meta.env.VITE_APPOINTMENT_API || 'http://localhost:5003/api';
const PATIENT_ID = 'pat_12345'; // Hardcoded for this assessment

export default function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${APPOINTMENT_API_URL}/appointments`, {
        headers: {
          'x-user-id': PATIENT_ID,
          'x-user-role': 'PATIENT'
        }
      });
      
      if (response.data.success) {
        setAppointments(response.data.data.appointments);
      }
    } catch (err) {
      setError('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await axios.patch(`${APPOINTMENT_API_URL}/appointments/${id}/status`, 
        { status: 'CANCELLED' },
        {
          headers: {
            'x-user-id': PATIENT_ID,
            'x-user-role': 'PATIENT'
          }
        }
      );
      fetchAppointments(); // Refresh list
    } catch (err) {
      alert('Failed to cancel appointment');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Appointments</h1>
          <p className="text-gray-500 mt-1">Manage your upcoming visits and view history.</p>
        </div>
        <Link 
          to="/book" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-medium transition-colors"
        >
          Book New Appointment
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No appointments found</h3>
          <p className="mt-1 text-gray-500">You haven't booked any appointments yet.</p>
          <div className="mt-6">
            <Link to="/book" className="text-blue-600 hover:text-blue-800 font-medium font-semibold">
              Get started by booking one &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <li key={appointment._id}>
                <div className="px-4 py-5 sm:px-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                          {appointment.doctorName.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">{appointment.doctorName}</h4>
                        <div className="text-sm text-gray-500 mt-1 flex items-center">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {appointment.appointmentDate ? appointment.appointmentDate.split('T')[0] : 'N/A'} at {appointment.startTime || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex space-x-2">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 
                            appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                            appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {appointment.status}
                        </span>
                        
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${appointment.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {appointment.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex space-x-3 text-sm">
                        {appointment.paymentStatus !== 'PAID' && appointment.status !== 'CANCELLED' && (
                          <Link 
                            to={`/checkout/${appointment._id}`}
                            className="text-blue-600 hover:text-blue-900 font-medium bg-blue-50 px-3 py-1 rounded"
                          >
                            Pay Now
                          </Link>
                        )}
                        {(appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') && (
                          <button 
                            onClick={() => cancelAppointment(appointment._id)}
                            className="text-red-600 hover:text-red-900 font-medium cursor-pointer px-3 py-1"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
