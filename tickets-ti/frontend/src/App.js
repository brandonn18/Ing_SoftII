import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/shared/PrivateRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import TicketCreate from './pages/TicketCreate';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Forbidden from './pages/Forbidden';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/403" element={<Forbidden />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="tickets/nuevo" element={<TicketCreate />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route
                path="users"
                element={
                  <PrivateRoute roles={['administrador']}>
                    <Users />
                  </PrivateRoute>
                }
              />
              <Route path="reports" element={<Reports />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
          <ToastContainer position="top-right" autoClose={3000} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
