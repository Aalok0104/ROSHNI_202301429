// src/components/ResourcePanel.tsx
import React from 'react';
import '../styles.css';

const resourceData = {
  personnel: {
    deployed: 75,
    total: 150,
  },
  responders: {
    onField: 60,
    total: 120,
  },
  vehicles: {
    fireTrucks: 10,
    policeCars: 25,
    ambulances: 15,
  },
  equipment: {
    defibrillators: 50,
    firstAidKits: 200,
  },
};

export default function ResourcePanel() {
  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Resource Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Personnel</h3>
          <p>Deployed: {resourceData.personnel.deployed}</p>
          <p>Total: {resourceData.personnel.total}</p>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Responders</h3>
          <p>On Field: {resourceData.responders.onField}</p>
          <p>Total: {resourceData.responders.total}</p>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Vehicles</h3>
          <p>Fire Trucks: {resourceData.vehicles.fireTrucks}</p>
          <p>Police Cars: {resourceData.vehicles.policeCars}</p>
          <p>Ambulances: {resourceData.vehicles.ambulances}</p>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Equipment</h3>
          <p>Defibrillators: {resourceData.equipment.defibrillators}</p>
          <p>First Aid Kits: {resourceData.equipment.firstAidKits}</p>
        </div>
      </div>
    </div>
  );
}
