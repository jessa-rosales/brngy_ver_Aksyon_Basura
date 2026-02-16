import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CloseSidebar from './components/CloseSidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import CitizenReports from './pages/CitizenReports';
import UserManagement from './pages/UserManagement'; 
import ZoneManagement from './pages/ZoneManagement';
import Announcement from './pages/Announcement';
import AssignTask from './pages/AssignTask'; // ✅ 1. ADD THIS IMPORT
import ProfileSettings from './pages/ProfileSettings'; 
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<CloseSidebar><Dashboard /></CloseSidebar>} />
          <Route path="/reports" element={<CloseSidebar><CitizenReports /></CloseSidebar>} />
          <Route path="/zones" element={<CloseSidebar><ZoneManagement /></CloseSidebar>} />
          <Route path="/users" element={<CloseSidebar><UserManagement /></CloseSidebar>} />
          <Route path="/announcements" element={<CloseSidebar><Announcement /></CloseSidebar>} />
          <Route path="/assign-task" element={<CloseSidebar><AssignTask /></CloseSidebar>} />
          
          {/* ✅ ADD THIS: Wrap in CloseSidebar to keep the header/sidebar layout */}
          <Route path="/profile-settings" element={<CloseSidebar><ProfileSettings /></CloseSidebar>} />
          
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </UserProvider>  
  );
}

export default App;