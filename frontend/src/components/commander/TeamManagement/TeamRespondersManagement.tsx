import React, { useState, useEffect } from 'react';
import { Plus, XCircle, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import './teamsManagementStyles.css';

// --- Types based on your backend schema (simplified for frontend use) ---
interface ResponderMember {
  user_id: string; // Corresponds to user_id in the database
  full_name: string; // API returns full_name
  responder_type: string;
  email?: string; // Assuming email is returned for contact
  badge_number: string;
  status: string;
  team_name?: string;
}

interface TeamRespondersManagementProps {
  teamId: string;
  teamName: string;
  onBackToTeams: () => void;
  onNavigateToAddResponders: (teamId: string, teamName: string) => void;
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
const TeamRespondersManagement: React.FC<TeamRespondersManagementProps> = ({
  teamId,
  teamName,
  onBackToTeams,
  onNavigateToAddResponders,
}) => {
  const [members, setMembers] = useState<ResponderMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // --- API Call Integration (Fetching Team Members) ---
  useEffect(() => {
    const fetchTeamMembers = async () => {
      setIsLoading(true);
      setError(null);
      
      // Target the FastAPI GET endpoint with the team_id query parameter
      const API_ENDPOINT = `${API_BASE_URL}/commander/responders?team_id=${teamId}&status=active`;
      
      try {
        const response = await fetch(API_ENDPOINT, {
          credentials: 'include', // Send cookies for authentication
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch team members: ${response.statusText}`);
        }
        
        const data: ResponderMember[] = await response.json(); 
        setMembers(data);
        
      } catch (err) {
        console.error("Failed to fetch team members:", err);
        setError("Could not load team members. Check the server connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [teamId]); // Dependency on teamId ensures fetch runs whenever the team context changes


  // --- API Call Integration (Removing a Responder) ---
  const handleRemoveResponder = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from the team? This will make them available.`)) {
      return;
    }

    // API call: PATCH /commander/responders/{userId}
    const API_ENDPOINT = `${API_BASE_URL}/commander/responders/${userId}`;
    
    try {
      // Send a PATCH request to set team_id to null (making them available)
      const response = await fetch(API_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies for authentication
        body: JSON.stringify({ team_id: null }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove responder.');
      }
      
      // Update local state by filtering the removed member out
      setMembers(prev => prev.filter(member => member.user_id !== userId));

    } catch (err) {
      console.error("Removal failed:", err);
      alert(`Failed to remove responder: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Filtering logic
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      member.responder_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || member.responder_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // --- Rendering States ---
  if (isLoading) {
    return <div className="loading-state">Loading team members...</div>;
  }
  
  if (error) {
    return <div className="error-state">{error}</div>;
  }
  
  return (
    <div className="teams-management-container">
      
      {/* Back Button / Context */}
      <button onClick={onBackToTeams} className="back-button">
        <ChevronLeft size={18} />
        <span>Back to Teams Management</span>
      </button>

      {/* Header */}
      <div className="teams-management-header">
        <h1 className="teams-management-title">Responders Management</h1>
        <p className="teams-management-subtitle">Manage and coordinate all individual responders.</p>
      </div>

      {/* Team Name Context */}
      <div className="team-context">
        <h2 className="team-name">{teamName}</h2>
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search responders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <Search className="search-icon" size={20} />
        </div>

        {/* Filter and Add Responder Button */}
        <div className="button-group">
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
          
          <button
            onClick={() => onNavigateToAddResponders(teamId, teamName)}
            className="primary-button"
          >
            <Plus size={16} />
            <span>Add New Responder</span>
          </button>
        </div>
      </div>

      {/* Responders Table */}
      <div className="table-container">
        <table className="data-table">
          <thead className="table-header">
            <tr>
              <th>RESPONDER NAME</th>
              <th>RESPONDER TYPE</th>
              <th>CONTACT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredMembers.map((member) => (
              <tr key={member.user_id}>
                <td>{member.full_name}</td>
                <td>
                  <ResponderTypeBadge type={member.responder_type} />
                </td>
                <td>{member.email || 'N/A'}</td>
                <td>
                  <button
                    onClick={() => handleRemoveResponder(member.user_id, member.full_name)}
                    className="action-icon action-icon-remove"
                    title="Remove Responder from Team"
                  >
                    <XCircle size={20} />
                  </button>
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

export default TeamRespondersManagement;