import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-6 border rounded shadow">
        <h2 className="text-2xl mb-4">Login</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Username</label>
          <input className="w-full p-2 border rounded mb-3" value={username} onChange={(e) => setUsername(e.target.value)} />
          <label className="block mb-2">Password</label>
          <input type="password" className="w-full p-2 border rounded mb-3" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="text-red-600 mb-3">{error}</div>}
          <button className="w-full bg-blue-600 text-white py-2 rounded" type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
