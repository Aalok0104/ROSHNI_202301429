import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">Welcome to the App</h1>
      <p className="mb-6">A simple role-based app (civilian, responder, commander).</p>
      <div className="space-x-4">
        <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded">Login</Link>
        <Link to="/signup" className="px-4 py-2 bg-green-600 text-white rounded">Signup</Link>
      </div>
    </div>
  );
}
