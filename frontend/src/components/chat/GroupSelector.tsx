// src/components/GroupSelector.tsx
import React, { useState } from "react";

interface Props {
  onCreateGroup: (groupId: string) => void;
}

const sampleResponders = ["Responder-01", "Responder-02", "Logistics-1", "Responder-03"];

const GroupSelector: React.FC<Props> = ({ onCreateGroup }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (r: string) => setSelected((p) => (p.includes(r) ? p.filter(x => x !== r) : [...p, r]));

  const handleCreate = () => {
    const id = `grp-${Date.now()}`;
    onCreateGroup(id);
    setSelected([]);
  };

  return (
    <div>
      <h4 className="font-semibold mb-2">Select Responders (local)</h4>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {sampleResponders.map(r => (
          <label key={r} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(r)} onChange={() => toggle(r)} />
            <span>{r}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={handleCreate} className="px-3 py-1 bg-blue-600 text-white rounded">Create Group</button>
      </div>
    </div>
  );
};

export default GroupSelector;
