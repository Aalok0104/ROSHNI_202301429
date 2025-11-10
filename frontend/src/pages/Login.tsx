import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithCredentials } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Enter username and password');
      return;
    }
    const ok = await loginWithCredentials(username, password);
    if (ok) {
      navigate(from, { replace: true });
    } else {
      setError('Invalid credentials or server error');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-form-title">Welcome Back</h2>
          </div>
          
          <div className="auth-body">
            <p className="auth-form-subtitle">Sign in to access your account</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="auth-label" htmlFor="login-username">Username</label>
                <input 
                  id="login-username"
                  className="auth-input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </div>
              
              <div className="form-group">
                <label className="auth-label" htmlFor="login-password">Password</label>
                <input 
                  id="login-password"
                  type="password" 
                  className="auth-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
              
              {error && <div className="auth-error">{error}</div>}
              
              <button className="auth-button auth-button-primary" type="submit">
                Sign In
              </button>
            </form>
            
            <div className="auth-footer">
              <p className="auth-footer-text">
                Don't have an account?{' '}
                <Link to="/signup" className="auth-link">Create one now</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
