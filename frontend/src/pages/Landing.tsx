import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // adjust the import path if needed
import '../styles.css';

export default function Landing() {
  const { user, logout } = useAuth(); // get current user from context

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to the App</h1>
      <p className="mb-6 text-gray-700">
        A simple role-based app (Civilian, Responder, Commander).
      </p>

      {user ? (
        <div className="space-x-4">
          <Link
            to={`/${user.role || 'dashboard'}`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Go to {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Dashboard'}
          </Link>
        </div>
      ) : (
        <div className="space-x-4">
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Signup
          </Link>
        </div>
      )}
    </div>
  );
}
