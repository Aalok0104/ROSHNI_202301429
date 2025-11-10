import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('civilian');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Missing fields');
      return;
    }
    const ok = await signup(username, password, role);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Signup failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-form-title">Create Account</h2>
          </div>

          <div className="auth-body">
            <p className="auth-form-subtitle">Join the disaster management network</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="auth-label" htmlFor="signup-username">Username</label>
                <input 
                  id="signup-username"
                  className="auth-input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                />
              </div>
              
              <div className="form-group">
                <label className="auth-label" htmlFor="signup-password">Password</label>
                <input 
                  id="signup-password"
                  type="password" 
                  className="auth-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>

              <div className="form-group">
                <label className="auth-label" htmlFor="signup-role">Role</label>
                <select 
                  id="signup-role"
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  className="auth-input auth-select"
                >
                  <option value="civilian">Civilian</option>
                  <option value="responder">Responder</option>
                  <option value="commander">Commander</option>
                </select>
              </div>

              {error && <div className="auth-error">{error}</div>}
              
              <button className="auth-button auth-button-secondary" type="submit">
                Create Account
              </button>
            </form>
            
            <div className="auth-footer">
              <p className="auth-footer-text">
                Already have an account?{' '}
                <Link to="/login" className="auth-link">Sign in here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
