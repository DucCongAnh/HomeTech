import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/admin/AdminDashboard';
import OAuthCallback from './pages/OAuthCallback';
import Home from './pages/Home';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Admin login - separate URL */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/AdminLogin" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/AdminRegister" element={<AdminRegister />} />
        
        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* OAuth2 callback */}
        <Route path="/oauth2/callback" element={<OAuthCallback />} />
        
        {/* Protected routes */}
        <Route path="/" element={<Home />} />
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
// export default function App() {
//   return (
//     <h1 className="text-4xl font-bold text-red-500">
//       Tailwind đang hoạt động!
//     </h1>
//   );
// }
