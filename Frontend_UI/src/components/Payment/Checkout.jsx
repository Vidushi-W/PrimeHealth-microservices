import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const APPOINTMENT_API_URL = import.meta.env.VITE_APPOINTMENT_API || 'http://localhost:5003/api';
const PAYMENT_API_URL = import.meta.env.VITE_PAYMENT_API || 'http://localhost:5004/api';

export default function Checkout() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  const fetchAppointment = async () => {
    try {
      const response = await axios.get(`${APPOINTMENT_API_URL}/appointments/${appointmentId}`, {
        headers: {
          'x-user-id': 'pat_12345',
          'x-user-role': 'PATIENT'
        }
      });
      
      if (response.data.success) {
        setAppointment(response.data.data);
      }
    } catch (err) {
      setError('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError('');
    
    try {
      const payload = {
        appointmentId,
        patientId: appointment.patientId,
        amount: 150.00, // Standard consulting fee
        paymentMethod
      };
      
      const response = await axios.post(`${PAYMENT_API_URL}/payments`, payload, {
        headers: {
          'x-user-id': 'pat_12345',
          'x-user-role': 'PATIENT'
        }
      });
      
      if (response.data.success) {
        // Simple success view could go here, but redirecting with query param is easier
        alert('Payment successful! Your appointment is now confirmed.');
        navigate('/appointments');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center mt-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );

  if (!appointment) return (
    <div className="text-center mt-20">
      <h2 className="text-2xl font-bold text-gray-800">Appointment not found</h2>
      <button onClick={() => navigate('/appointments')} className="mt-4 text-blue-600">Back to appointments</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden glass-panel flex flex-col md:flex-row">
        
        {/* Order Summary */}
        <div className="bg-blue-50 p-8 w-full md:w-1/3">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Order Summary</h3>
          <dl className="text-sm text-gray-600 space-y-4">
            <div className="flex justify-between">
              <dt>Service</dt>
              <dd className="font-medium text-gray-900">Doctor Consultation</dd>
            </div>
            <div className="flex justify-between">
              <dt>Provider</dt>
              <dd className="font-medium text-gray-900">{appointment.doctorName}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Date & Time</dt>
              <dd className="font-medium text-gray-900">
                {appointment.appointmentDate ? appointment.appointmentDate.split('T')[0] : 'N/A'} / {appointment.startTime || 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between pt-4 border-t border-blue-200">
              <dt className="text-base font-medium text-gray-900">Amount Due</dt>
              <dd className="text-base font-extrabold text-blue-600">$150.00</dd>
            </div>
          </dl>
        </div>

        {/* Payment Form */}
        <div className="p-8 w-full md:w-2/3">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment</h2>
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                <div 
                  className={`border rounded-lg text-center p-3 cursor-pointer transition-colors ${paymentMethod === 'CREDIT_CARD' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                >
                  <span className="block text-sm font-medium">Credit Card</span>
                </div>
                <div 
                  className={`border rounded-lg text-center p-3 cursor-pointer transition-colors ${paymentMethod === 'INSURANCE' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setPaymentMethod('INSURANCE')}
                >
                  <span className="block text-sm font-medium">Insurance</span>
                </div>
                <div 
                  className={`border rounded-lg text-center p-3 cursor-pointer transition-colors ${paymentMethod === 'CASH' ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setPaymentMethod('CASH')}
                >
                  <span className="block text-sm font-medium">Cash</span>
                </div>
              </div>
            </div>

            {paymentMethod === 'CREDIT_CARD' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-3">Please note: This is a simulation. A mock payment gateway is used.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Card number</label>
                    <input type="text" className="mt-1 w-full border-gray-300 rounded shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border" placeholder="0000 0000 0000 0000" defaultValue="4242 4242 4242 4242" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Expiration date</label>
                      <input type="text" className="mt-1 w-full border-gray-300 rounded shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border" placeholder="MM/YY" defaultValue="12/28" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">CVC</label>
                      <input type="text" className="mt-1 w-full border-gray-300 rounded shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border" placeholder="123" defaultValue="123" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={processing}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-6 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {processing ? 'Processing Payment...' : 'Pay $150.00'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              90% simulated success rate. If it fails, try again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
