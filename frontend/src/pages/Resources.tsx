import React from 'react';
import ResourcePanel from '../components/ResourcePanel';
import '../styles.css';

export default function Resources() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <ResourcePanel />
      </div>
    </div>
  );
}
