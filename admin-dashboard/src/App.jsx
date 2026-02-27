import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CloseSidebar from './components/CloseSidebar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import CollectedBins from './pages/CollectedBins';
import CitizenReports from './pages/CitizenReports';
import UserManagement from './pages/UserManagement'; 
import ZoneManagement from './pages/ZoneManagement';
import Announcement from './pages/Announcement';
import AssignTask from './pages/AssignTask'; 
import ProfileSettings from './pages/ProfileSettings'; 
import { UserProvider, useUser } from './context/UserContext';
import ArchiveCenter from './pages/ArchiveCenter';

// --- ADMIN PROTECTED ROUTE COMPONENT ---
// This ensures that even if someone finds a link, they can't see data without being an Admin
const AdminRoute = ({ children }) => {
  const { user, loading } = useUser();
  const token = localStorage.getItem("token");

  if (loading) return null; // Or a loading spinner

  // If no token or role is not Admin, boot them back to the landing page
  if (!token || (user && user.role !== 'Admin')) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* SECRET ADMIN LOGIN 
            Change this string to whatever you want your secret link to be.
            Example: /admin-portal-access-77 
          */}
          <Route path="/admin-portal-access" element={<Login />} />

          {/* PROTECTED ADMIN ROUTES 
            All these routes now check if the user is an Admin via AdminRoute.
            If a Driver or Citizen tries to access these via URL, they get redirected to "/"
          */}
          <Route path="/dashboard" element={
            <AdminRoute><CloseSidebar><Dashboard /></CloseSidebar></AdminRoute>
          } />

          <Route path="/bins" element={
            <AdminRoute><CloseSidebar><CollectedBins /></CloseSidebar></AdminRoute>
          } />
          
          
          <Route path="/reports" element={
            <AdminRoute><CloseSidebar><CitizenReports /></CloseSidebar></AdminRoute>
          } />
          
          <Route path="/zones" element={
            <AdminRoute><CloseSidebar><ZoneManagement /></CloseSidebar></AdminRoute>
          } />
          
          <Route path="/users" element={
            <AdminRoute><CloseSidebar><UserManagement /></CloseSidebar></AdminRoute>
          } />
          
          <Route path="/announcements" element={
            <AdminRoute><CloseSidebar><Announcement /></CloseSidebar></AdminRoute>
          } />
          
          <Route path="/assign-task" element={
            <AdminRoute><CloseSidebar><AssignTask /></CloseSidebar></AdminRoute>
          } />

          <Route path="/archive-center" element={
            <AdminRoute><CloseSidebar><ArchiveCenter /></CloseSidebar></AdminRoute>
          } />
          
          <Route path="/profile-settings" element={
            <AdminRoute><CloseSidebar><ProfileSettings /></CloseSidebar></AdminRoute>
          } />
          
          {/* Catch-all: Redirect unknown routes to Landing Page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </UserProvider>  
  );
}

export default App;