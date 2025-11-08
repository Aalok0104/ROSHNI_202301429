import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

export default function Dashboard(){
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    // Redirect to role-specific page
    if (user.role === 'civilian') navigate('/civilian');
    else if (user.role === 'responder') navigate('/responder');
    else if (user.role === 'commander') navigate('/commander');
    else navigate('/unauthorized');
  }, [user]);

  return (
    <div className="p-8">
      <h1 className="text-2xl">Redirecting...</h1>
    </div>
  );
}
