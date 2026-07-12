import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Organization from './pages/Organization';
import Assets from './pages/Assets';
import Allocations from './pages/Allocations';
import Bookings from './pages/Bookings';
import Maintenance from './pages/Maintenance';
import Audits from './pages/Audits';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/organization" element={<Organization />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/audits" element={<Audits />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>
    </Routes>
  );
}