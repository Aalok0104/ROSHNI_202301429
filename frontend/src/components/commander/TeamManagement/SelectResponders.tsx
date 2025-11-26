import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Filter, Search, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import './teamsManagementStyles.css';


interface Responder {
  user_id: string; 
  full_name: string; 
  responder_type: string;
  badge_number: string;
  email?: string;
  status: string;
  team_name?: string | null; 
}

interface SelectRespondersProps {
    teamId: string; 
    teamName: string;
    onBackToTeamManagement: () => void; 
}

// --- Responder Type Badge Component (reused) ---
const ResponderTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const getColorClass = () => {
    if (type === 'Medic' || type === 'medic') return 'badge-medic';
    if (type === 'Logistics' || type === 'logistics' || type === 'logistician') return 'badge-logistics';
    if (type === 'Engineer' || type === 'engineer') return 'badge-engineer';
    if (type.toLowerCase().includes('rescue') || type.toLowerCase().includes('fire')) return 'badge-rescue';
    if (type.toLowerCase().includes('police')) return 'badge-police';
    return 'badge-inactive';
  };

  return (
    <span className={`badge ${getColorClass()}`}>
      {type}
    </span>
  );
};

// --- Main Component ---
const SelectResponders: React.FC<SelectRespondersProps> = ({ teamId, teamName, onBackToTeamManagement }) => {
  const [availableResponders, setAvailableResponders] = useState<Responder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    const fetchAvailableResponders = async () => {
      setIsLoading(true);
      setError(null);
      
      const API_ENDPOINT = `${API_BASE_URL}/commander/responders?status=active`; 

      try {
        const response = await fetch(API_ENDPOINT, {
          credentials: 'include', 
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch available responders: ${response.statusText}`);
        }
        
        const data: Responder[] = await response.json();
       
        const available = data.filter(responder => !responder.team_name);
        setAvailableResponders(available);
        
      } catch (err) {
        console.error("Failed to fetch available responders:", err);
        setError("Could not load available responders. Check the server connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableResponders();
  }, [teamId]); 

  // --- API Call Integration (Adding a Responder to the Team) ---
  const handleAddResponder = async (responderId: string, responderName: string) => {
    if (!window.confirm(`Add ${responderName} to ${teamName}?`)) {
        return;
    }
    
    // API call: PATCH /commander/responders/{userId} to assign the team_id
    const API_ENDPOINT = `${API_BASE_URL}/commander/responders/${responderId}`;
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', 
        body: JSON.stringify({ 
            team_id: teamId, 
            status: 'active',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add responder to team.');
      }
      

      setAvailableResponders(prev => prev.filter(r => r.user_id !== responderId));
      alert(`${responderName} added successfully to ${teamName}!`);

    } catch (err) {
      console.error("Addition failed:", err);
      alert(`Failed to add responder: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- API Call Integration (Deleting a Responder) ---
  const handleDeleteResponder = async (responderId: string, responderName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${responderName}? This action cannot be undone.`)) {
      return;
    }

    const API_ENDPOINT = `${API_BASE_URL}/commander/responders/${responderId}`;

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete responder');
      }

      // Remove the deleted responder from the list
      setAvailableResponders(prev => prev.filter(r => r.user_id !== responderId));
      alert(`${responderName} has been deleted successfully!`);

    } catch (err) {
      console.error("Deletion failed:", err);
      alert(`Failed to delete responder: ${err instanceof Error ? err.message : String(err)}`);
    }
  };


  // Filtering logic
  const filteredResponders = availableResponders.filter(responder => {
    const matchesSearch = responder.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      responder.responder_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || responder.responder_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // --- Rendering States ---
  if (isLoading) {
    return <div className="loading-state">Loading available responders...</div>;
  }
  
  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="teams-management-container">
      
      {/* Back Button */}
      <button onClick={onBackToTeamManagement} className="back-button">
        <ChevronLeft size={18} />
        <span>Back to Team</span>
      </button>

      {/* Header */}
      <div className="teams-management-header">
        <h1 className="teams-management-title">Select Available Responders</h1>
        <p className="teams-management-subtitle">
          Add available personnel to the <span style={{ fontWeight: 'bold' }}>{teamName}</span>
        </p>
      </div>

      {/* Controls */}
      <div className="controls-section">
        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search available responders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <Search className="search-icon" size={20} />
        </div>

        {/* Filter */}
        <div className="filter-dropdown-container">
          <button 
            className="filter-button"
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
          >
            <Filter size={16} />
            <span>Type</span>
          </button>
          {showTypeDropdown && (
            <div className="filter-dropdown">
              <button onClick={() => { setSelectedType('all'); setShowTypeDropdown(false); }}>
                All Types
              </button>
              <button onClick={() => { setSelectedType('medic'); setShowTypeDropdown(false); }}>
                Medic
              </button>
              <button onClick={() => { setSelectedType('firefighter'); setShowTypeDropdown(false); }}>
                Firefighter
              </button>
              <button onClick={() => { setSelectedType('police'); setShowTypeDropdown(false); }}>
                Police
              </button>
              <button onClick={() => { setSelectedType('disaster_responder'); setShowTypeDropdown(false); }}>
                Disaster Responder
              </button>
              <button onClick={() => { setSelectedType('logistician'); setShowTypeDropdown(false); }}>
                Logistician
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Responders Table */}
      <div className="table-container">
        <table className="data-table">
          <thead className="table-header">
            <tr>
              <th>RESPONDER NAME</th>
              <th>RESPONDER TYPE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredResponders.map((responder) => (
              <tr key={responder.user_id}>
                <td>{responder.full_name}</td>
                <td>
                  <ResponderTypeBadge type={responder.responder_type} />
                </td>
                <td>
                  {/* Action buttons: Add and Delete */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAddResponder(responder.user_id, responder.full_name)}
                      className="action-icon action-icon-add"
                      title="Add Responder to Team"
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteResponder(responder.user_id, responder.full_name)}
                      className="action-icon action-icon-remove"
                      title="Delete Responder"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button className="pagination-button">
          <ChevronLeft size={16} />
        </button>
        <span className="pagination-page">1</span>
        <button className="pagination-button">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default SelectResponders;