import React from 'react';
import { useAuth } from '../context/AuthContext';
import MapPanel from '../components/MapPanel';
import CommunicationPanel from '../components/CommunicationPanel';
import '../styles.css';

export default function Commander() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded shadow p-4">
          <h1 className="text-2xl font-semibold mb-2">Commander Dashboard</h1>
          <p className="text-sm text-gray-600 mb-4">
            Welcome <span className="font-medium">{user?.username}</span> — Role: <span className="font-medium">{user?.role}</span>
          </p>
          <MapPanel />
        </div>

        <aside className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Communications</h2>
          <CommunicationPanel />
        </aside>
      </div>
    </div>
  );
}
