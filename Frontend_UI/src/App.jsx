import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import BookAppointment from './components/Appointments/BookAppointment';
import AppointmentList from './components/Appointments/AppointmentList';
import Checkout from './components/Payment/Checkout';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-2xl font-bold gradient-text">PrimeHealth</span>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/"
                    className="border-primary text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/book"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Book Appointment
                  </Link>
                  <Link
                    to="/appointments"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    My Appointments
                  </Link>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-sm font-medium text-gray-500">
                  Patient Module
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Routes>
            <Route path="/" element={<AppointmentList />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/appointments" element={<AppointmentList />} />
            <Route path="/checkout/:appointmentId" element={<Checkout />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white mt-auto border-t border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
            <div className="flex justify-center space-x-6 md:order-2">
              <span className="text-gray-400">Microservices Project</span>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-base text-gray-400">
                &copy; 2026 PrimeHealth. Sithmi's Module.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
