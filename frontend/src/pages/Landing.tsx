import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // adjust the import path if needed
import '../styles.css';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="hero-container">
        <div className="hero-card">
          <div className="hero-header">
            <h1 className="hero-title">Welcome to the App</h1>
            <p className="hero-sub">A simple role-based app (Civilian, Responder, Commander).</p>
          </div>

          <div className="hero-body">
            {user ? (
              <Link
                to={`/${user.role || 'dashboard'}`}
                className="hero-btn hero-btn-primary"
              >
                Go to {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Dashboard'}
              </Link>
            ) : (
              <div className="hero-actions">
                <Link to="/login" className="hero-btn hero-btn-primary">Login</Link>
                <Link to="/signup" className="hero-btn hero-btn-secondary">Signup</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
