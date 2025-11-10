// React import not required with the new JSX runtime
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import roshniLogo from '../assets/react.svg';
import '../styles.css';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Top-left logo bar (logo sits above the main navbar) */}
      <div className="top-logo-bar">
        <Link to="/" className="top-logo-link">
          <img src={roshniLogo} alt="Roshni" className="top-logo-img" />
          <div className="brand-text">
            <div className="brand-title">ROSHNI</div>
            <div className="brand-sub">Disaster Management</div>
          </div>
        </Link>
      </div>

      <nav className="app-navbar">
        <div className="nav-center">
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            {/* hide the Dashboard link for civilians to avoid navigation loops */}
            {user && user.role !== 'civilian' && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
            {user?.role === 'commander' && <Link to="/commander" className="nav-link">Commander</Link>}
            {user?.role === 'responder' && <Link to="/responder" className="nav-link">Responder</Link>}
            {user?.role === 'civilian' && <Link to="/civilian" className="nav-link nav-link-active">Civilian</Link>}
          </div>
        </div>

        <div className="nav-actions">
          {user && (
            <>
              <Link to="/profile" className="profile-area" aria-label="Profile">
                <span className="avatar">{user.username ? user.username.charAt(0).toUpperCase() : 'U'}</span>
              </Link>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </>
          )}

          {/* Top-right auth links removed - Login/Signup are available in page content (landing/hero) */}
        </div>
      </nav>
    </>
  );
}