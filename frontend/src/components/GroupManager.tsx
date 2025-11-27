// src/components/GroupManager.tsx
import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config";

interface Responder {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface GroupManagerProps {
  onGroupCreated: () => void;
}

const GroupManager: React.FC<GroupManagerProps> = ({ onGroupCreated }) => {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [selectedResponders, setSelectedResponders] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchResponders();
  }, []);

  const fetchResponders = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.responders, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch responders");
      const data = await res.json();
      setResponders(data);
    } catch (e) {
      setError((e as Error).message || "Failed to load responders");
    }
  };

  const toggleResponder = (id: string) => {
    setSelectedResponders((p) => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) { setError("Group name is required"); return; }
    if (selectedResponders.length === 0) { setError("Pick at least one responder"); return; }

    setLoading(true);
    setError(null);
    try {
      // If your backend has a create-team endpoint, call it here.
      // For now keep local behavior: call legacy chatGroups if exists
      const res = await fetch(API_ENDPOINTS.chatGroups, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: groupName, memberIds: selectedResponders }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create group");
      }
      setGroupName("");
      setSelectedResponders([]);
      setShowForm(false);
      onGroupCreated();
    } catch (e) {
      setError((e as Error).message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="group-manager-collapsed">
        <button className="btn-create-group" onClick={() => setShowForm(true)}>+ Create New Group</button>
      </div>
    );
  }

  return (
    <div className="group-manager">
      <div className="group-manager-header">
        <h3>Create Response Team Group</h3>
        <button className="btn-close" onClick={() => { setShowForm(false); setError(null); setSelectedResponders([]); setGroupName(""); }}>✕</button>
      </div>

      <form onSubmit={handleCreateGroup} className="group-form">
        <div className="form-group">
          <label htmlFor="groupName">Group Name</label>
          <input id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Select Responders ({selectedResponders.length} selected)</label>
          <div className="responders-list">
            {responders.length === 0 ? <p>No responders available</p> : responders.map(r => (
              <div key={r.id} className={`responder-item ${selectedResponders.includes(r.id) ? "selected" : ""}`} onClick={() => toggleResponder(r.id)}>
                <input type="checkbox" checked={selectedResponders.includes(r.id)} onChange={() => {}} onClick={(e) => e.stopPropagation()} />
                <div className="responder-info">
                  <div className="responder-name">{r.name}</div>
                  <div className="responder-email">{r.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setError(null); setSelectedResponders([]); setGroupName(""); }} disabled={loading}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading || selectedResponders.length === 0}>{loading ? "Creating..." : "Create Group"}</button>
        </div>
      </form>
    </div>
  );
};

export default GroupManager;
