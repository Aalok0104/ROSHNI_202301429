import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="flex gap-4 p-4 bg-gray-900 text-white">
      <Link to="/" className="font-semibold">Home</Link>
      {user && <Link to="/dashboard" className="">Dashboard</Link>}
      {user && user.role === 'commander' && (
        <Link to="/commander" className="">Commander</Link>
      )}
      {user && user.role === 'responder' && (
        <Link to="/responder" className="">Responder</Link>
      )}
      {user && user.role === 'civilian' && (
        <Link to="/civilian" className="">Civilian</Link>
      )}

      <div className="ml-auto">
        {user ? (
          <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded">Logout</button>
        ) : (
          <>
            <Link to="/login" className="mr-2">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}