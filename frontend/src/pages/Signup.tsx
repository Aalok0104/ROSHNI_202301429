import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-6 border rounded shadow">
        <h2 className="text-2xl mb-4">Signup</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Username</label>
          <input className="w-full p-2 border rounded mb-3" value={username} onChange={(e) => setUsername(e.target.value)} />
          <label className="block mb-2">Password</label>
          <input type="password" className="w-full p-2 border rounded mb-3" value={password} onChange={(e) => setPassword(e.target.value)} />

          <label className="block mb-2">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded mb-3">
            <option value="civilian">Civilian</option>
            <option value="responder">Responder</option>
            <option value="commander">Commander</option>
          </select>

          {error && <div className="text-red-600 mb-3">{error}</div>}
          <button className="w-full bg-green-600 text-white py-2 rounded" type="submit">Signup</button>
        </form>
      </div>
    </div>
  );
}
