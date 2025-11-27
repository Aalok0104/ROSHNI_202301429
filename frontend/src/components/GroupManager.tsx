import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import './GroupManager.css';

interface Responder {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface GroupManagerProps {
  onGroupCreated: () => void;
}

const GroupManager = ({ onGroupCreated }: GroupManagerProps) => {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [selectedResponders, setSelectedResponders] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchResponders();
  }, []);

  const fetchResponders = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.responders, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch responders');
      
      const data = await response.json();
      setResponders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load responders');
    }
  };

  const toggleResponder = (responderId: string) => {
    setSelectedResponders((prev) =>
      prev.includes(responderId)
        ? prev.filter((id) => id !== responderId)
        : [...prev, responderId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    if (selectedResponders.length === 0) {
      setError('Please select at least one responder');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.chatGroups, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedResponders,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create group');
      }

      // Reset form
      setGroupName('');
      setSelectedResponders([]);
      setShowForm(false);
      onGroupCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="group-manager-collapsed">
        <button
          className="btn-create-group"
          onClick={() => setShowForm(true)}
        >
          + Create New Group
        </button>
      </div>
    );
  }

  return (
    <div className="group-manager">
      <div className="group-manager-header">
        <h3>Create Response Team Group</h3>
        <button
          className="btn-close"
          onClick={() => {
            setShowForm(false);
            setError(null);
            setSelectedResponders([]);
            setGroupName('');
          }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleCreateGroup} className="group-form">
        <div className="form-group">
          <label htmlFor="groupName">Group Name</label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Fire Response Team Alpha"
            required
          />
        </div>

        <div className="form-group">
          <label>Select Responders ({selectedResponders.length} selected)</label>
          <div className="responders-list">
            {responders.length === 0 ? (
              <p className="no-responders">No responders available</p>
            ) : (
              responders.map((responder) => (
                <div
                  key={responder.id}
                  className={`responder-item ${
                    selectedResponders.includes(responder.id) ? 'selected' : ''
                  }`}
                  onClick={() => toggleResponder(responder.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedResponders.includes(responder.id)}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="responder-info">
                    <div className="responder-name">{responder.name}</div>
                    <div className="responder-email">{responder.email}</div>
                    {responder.phone && (
                      <div className="responder-phone">{responder.phone}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowForm(false);
              setError(null);
              setSelectedResponders([]);
              setGroupName('');
            }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || selectedResponders.length === 0}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroupManager;
