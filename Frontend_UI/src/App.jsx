import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DoctorListPage from './pages/DoctorListPage';
import DoctorDetailsPage from './pages/DoctorDetailsPage';
import DoctorProfilePage from './pages/DoctorProfilePage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DoctorListPage />} />
        <Route path="/profile" element={<DoctorProfilePage />} />
        <Route path="/doctors/:doctorId" element={<DoctorDetailsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
