import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Civilian from './pages/Civilian';
import Responder from './pages/Responder';
import Commander from './pages/Commander';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './ProtectedRoutes';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/civilian" element={<ProtectedRoute allowedRoles={["civilian"]}><Civilian /></ProtectedRoute>} />
          <Route path="/responder" element={<ProtectedRoute allowedRoles={["responder"]}><Responder /></ProtectedRoute>} />
          <Route path="/commander" element={<ProtectedRoute allowedRoles={["commander"]}><Commander /></ProtectedRoute>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;