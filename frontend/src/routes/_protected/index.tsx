import { Navigate } from 'react-router-dom';

export default function ProtectedIndex() {
  return <Navigate to="/dashboard" replace />;
}