import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Filter, Search, Users, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../../../config';


interface Team {
  team_id: string;
  name: string;
  team_type: string;
  status: string;
  member_count: number;
  current_latitude?: number;
  current_longitude?: number;
}

interface TeamsManagementProps {
  onViewTeamDetails: (teamId: string, teamName: string) => void;
}

// --- Team Type Badge Component ---
const TeamTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const getColorClass = () => {
    switch (type) {
      case 'medic': return 'badge-medic';
      case 'fire': return 'badge-fire';
      case 'police': return 'badge-police';
      case 'mixed': return 'badge-mixed';
      case 'disaster_response': return 'badge-disaster-response';
      default: return 'badge-inactive';
    }
  };

  return (
    <span className={`badge ${getColorClass()}`}>
      {type}
    </span>
  );
};

// --- Status Badge Component ---
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getColorClass = () => {
    switch (status) {
      case 'active': return 'badge-active';
      case 'on_mission': return 'badge-on-mission';
      case 'standby': return 'badge-standby';
      case 'inactive': return 'badge-inactive';
      default: return 'badge-inactive';
    }
  };

  return (
    <span className={`badge ${getColorClass()}`}>
      {status}
    </span>
  );
};

// --- Main Component ---
const TeamsManagement: React.FC<TeamsManagementProps> = ({ onViewTeamDetails }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Create Team Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamType, setNewTeamType] = useState('medic');
  const [isCreating, setIsCreating] = useState(false);

  // Add Responder Modal States
  const [showAddResponderModal, setShowAddResponderModal] = useState(false);
  const [responderFormData, setResponderFormData] = useState({
    email: '',
    full_name: '',
    responder_type: 'medic',
    badge_number: '',
  });
  const [isAddingResponder, setIsAddingResponder] = useState(false);

  // --- API Call Integration (Fetching Teams) ---
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      setError(null);
      
      const API_ENDPOINT = `${API_BASE_URL}/commander/teams`;
      
      try {
        const response = await fetch(API_ENDPOINT, {
          credentials: 'include', // Send cookies for authentication
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch teams: ${response.statusText}`);
        }
        
        const data: Team[] = await response.json();
        setTeams(data);
        
      } catch (err) {
        console.error("Failed to fetch teams:", err);
        setError("Could not load teams. Check the server connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // --- Create Team Handler ---
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      alert('Please enter a team name');
      return;
    }

    setIsCreating(true);
    const API_ENDPOINT = `${API_BASE_URL}/commander/teams`;

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newTeamName.trim(),
          team_type: newTeamType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create team');
      }

      const newTeam: Team = await response.json();
      
      // Add new team to the list
      setTeams(prev => [...prev, newTeam]);
      
      // Reset form and close modal
      setNewTeamName('');
      setNewTeamType('medic');
      setShowCreateModal(false);
      
      alert(`Team "${newTeam.name}" created successfully!`);
    } catch (err) {
      console.error('Failed to create team:', err);
      alert(`Failed to create team: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCreating(false);
    }
  };

  // --- Delete Team Handler ---
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
      return;
    }

    const API_ENDPOINT = `${API_BASE_URL}/commander/teams/${teamId}`;

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      // Remove team from the list
      setTeams(prev => prev.filter(team => team.team_id !== teamId));
      alert(`Team "${teamName}" deleted successfully!`);
    } catch (err) {
      console.error('Failed to delete team:', err);
      alert(`Failed to delete team: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- Add Responder Handler ---
  const handleAddResponder = async () => {
    if (!responderFormData.email.trim() || !responderFormData.full_name.trim() || !responderFormData.badge_number.trim()) {
      alert('Please fill in all required fields (Email, Full Name, Badge Number)');
      return;
    }

    setIsAddingResponder(true);
    const API_ENDPOINT = `${API_BASE_URL}/commander/responders`;

    try {
      const payload = {
        email: responderFormData.email.trim(),
        full_name: responderFormData.full_name.trim(),
        responder_type: responderFormData.responder_type,
        badge_number: responderFormData.badge_number.trim(),
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create responder');
      }

      // Reset form and close modal
      setResponderFormData({
        email: '',
        full_name: '',
        responder_type: 'medic',
        badge_number: '',
      });
      setShowAddResponderModal(false);
      
      alert('Responder created successfully!');
    } catch (err) {
      console.error('Failed to create responder:', err);
      alert(`Failed to create responder: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAddingResponder(false);
    }
  };

  // Filtering logic
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.team_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || team.team_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || team.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // --- Rendering States ---
  if (isLoading) {
    return <div className="loading-state">Loading teams...</div>;
  }
  
  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="teams-management-container">
      
      {/* Header */}
      <div className="teams-management-header">
        <h1 className="teams-management-title">Teams Management</h1>
        <p className="teams-management-subtitle">Manage and coordinate all response teams.</p>
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <Search className="search-icon" size={20} />
        </div>

        {/* Filter and Add Team Button */}
        <div className="button-group">
          {/* Type Filter Dropdown */}
          <div className="filter-dropdown-container">
            <button 
              className="filter-button"
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowStatusDropdown(false);
              }}
            >
              <Filter size={16} />
              <span>Type: {selectedType === 'all' ? 'All' : selectedType}</span>
            </button>
            {showTypeDropdown && (
              <div className="filter-dropdown">
                <button onClick={() => { setSelectedType('all'); setShowTypeDropdown(false); }}>All</button>
                <button onClick={() => { setSelectedType('medic'); setShowTypeDropdown(false); }}>Medic</button>
                <button onClick={() => { setSelectedType('fire'); setShowTypeDropdown(false); }}>Fire</button>
                <button onClick={() => { setSelectedType('police'); setShowTypeDropdown(false); }}>Police</button>
                <button onClick={() => { setSelectedType('mixed'); setShowTypeDropdown(false); }}>Mixed</button>
                <button onClick={() => { setSelectedType('disaster_response'); setShowTypeDropdown(false); }}>Disaster Response</button>
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="filter-dropdown-container">
            <button 
              className="filter-button"
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowTypeDropdown(false);
              }}
            >
              <Filter size={16} />
              <span>Status: {selectedStatus === 'all' ? 'All' : selectedStatus}</span>
            </button>
            {showStatusDropdown && (
              <div className="filter-dropdown">
                <button onClick={() => { setSelectedStatus('all'); setShowStatusDropdown(false); }}>All</button>
                <button onClick={() => { setSelectedStatus('available'); setShowStatusDropdown(false); }}>Available</button>
                <button onClick={() => { setSelectedStatus('deployed'); setShowStatusDropdown(false); }}>Deployed</button>
                <button onClick={() => { setSelectedStatus('offline'); setShowStatusDropdown(false); }}>Offline</button>
              </div>
            )}
          </div>
          
          <button 
            className="primary-button"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Create New Team</span>
          </button>

          <button 
            className="primary-button"
            onClick={() => setShowAddResponderModal(true)}
            style={{ backgroundColor: '#10b981' }}
          >
            <Plus size={16} />
            <span>Add Responder</span>
          </button>
        </div>
      </div>

      {/* Teams Table */}
      <div className="table-container">
        <table className="data-table">
          <thead className="table-header">
            <tr>
              <th>TEAM NAME</th>
              <th>TYPE</th>
              <th>STATUS</th>
              <th>MEMBERS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredTeams.map((team) => (
              <tr key={team.team_id}>
                <td>
                  <button
                    onClick={() => onViewTeamDetails(team.team_id, team.name)}
                    className="name-link"
                  >
                    {team.name}
                  </button>
                </td>
                <td>
                  <TeamTypeBadge type={team.team_type} />
                </td>
                <td>
                  <StatusBadge status={team.status} />
                </td>
                <td>
                  <div className="icon-text">
                    <Users size={16} />
                    {team.member_count}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      onClick={() => onViewTeamDetails(team.team_id, team.name)}
                      className="text-button"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.team_id, team.name)}
                      className="action-icon action-icon-remove"
                      title="Delete Team"
                      style={{ padding: '0.375rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredTeams.length === 0 && (
        <div className="empty-state">
          No teams found. {searchTerm && "Try adjusting your search."}
        </div>
      )}

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

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create New Team</h2>
            
            <div className="form-group">
              <label className="form-label">Team Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Alpha-1 Search & Rescue"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Team Type *</label>
              <select
                className="form-select"
                value={newTeamType}
                onChange={(e) => setNewTeamType(e.target.value)}
                disabled={isCreating}
              >
                <option value="medic">Medic</option>
                <option value="fire">Fire</option>
                <option value="police">Police</option>
                <option value="mixed">Mixed</option>
                <option value="disaster_response">Disaster Response</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTeamName('');
                  setNewTeamType('medic');
                }}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={handleCreateTeam}
                disabled={isCreating || !newTeamName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Responder Modal */}
      {showAddResponderModal && (
        <div className="modal-overlay" onClick={() => setShowAddResponderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="modal-title">Add New Responder</h2>
            
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g., john.doe@emergency.gov"
                value={responderFormData.email}
                onChange={(e) => setResponderFormData({ ...responderFormData, email: e.target.value })}
                disabled={isAddingResponder}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., John Doe"
                value={responderFormData.full_name}
                onChange={(e) => setResponderFormData({ ...responderFormData, full_name: e.target.value })}
                disabled={isAddingResponder}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Responder Type *</label>
              <select
                className="form-select"
                value={responderFormData.responder_type}
                onChange={(e) => setResponderFormData({ ...responderFormData, responder_type: e.target.value })}
                disabled={isAddingResponder}
              >
                <option value="medic">Medic</option>
                <option value="firefighter">Firefighter</option>
                <option value="police">Police</option>
                <option value="disaster_responder">Disaster Responder</option>
                <option value="logistician">Logistician</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Badge Number *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., RES-001"
                value={responderFormData.badge_number}
                onChange={(e) => setResponderFormData({ ...responderFormData, badge_number: e.target.value })}
                disabled={isAddingResponder}
              />
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setShowAddResponderModal(false);
                  setResponderFormData({
                    email: '',
                    full_name: '',
                    responder_type: 'medic',
                    badge_number: '',
                  });
                }}
                disabled={isAddingResponder}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={handleAddResponder}
                disabled={isAddingResponder || !responderFormData.email.trim() || !responderFormData.full_name.trim() || !responderFormData.badge_number.trim()}
                style={{ backgroundColor: '#10b981' }}
              >
                {isAddingResponder ? 'Creating...' : 'Add Responder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsManagement;
