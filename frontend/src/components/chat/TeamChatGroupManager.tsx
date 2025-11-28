// src/components/chat/TeamChatGroupManager.tsx
// Logistician can see their team members to add to team chat
import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config";

interface Responder {
  user_id: string;
  full_name: string;
  email: string;
  responder_type: string;
  team_id: string;
}

interface Props {
  teamId: string;
  onClose: () => void;
}

const TeamChatGroupManager: React.FC<Props> = ({ teamId, onClose }) => {
  const [teamMembers, setTeamMembers] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [teamId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!teamId) {
        setError("No team assigned");
        setLoading(false);
        return;
      }
      
      // Use the responder endpoint to get team members
      const apiBaseUrl = API_ENDPOINTS.responderProfile.replace('/responders/me', '');
      const res = await fetch(`${apiBaseUrl}/responders/me/team/members`, {
        credentials: "include",
      });
      
      if (res.ok) {
        const teamResponders = await res.json();
        setTeamMembers(teamResponders);
      } else if (res.status === 404) {
        setError("No team assigned");
      } else {
        setError("Failed to load team members");
      }
    } catch (e) {
      setError("Failed to load team members");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "1.5rem", color: "#1f2937" }}>
        <p>Loading team members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "1.5rem", color: "#dc2626" }}>
        <p>{error}</p>
        <button 
          onClick={onClose} 
          style={{ 
            marginTop: "0.5rem", 
            padding: "0.5rem 1rem", 
            background: "#d1d5db", 
            borderRadius: "0.375rem",
            border: "none",
            cursor: "pointer"
          }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", color: "#1f2937" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Team Chat Members</h3>
        <button 
          onClick={onClose} 
          style={{ 
            fontSize: "1.5rem", 
            lineHeight: 1, 
            border: "none", 
            background: "transparent", 
            cursor: "pointer",
            color: "#6b7280"
          }}
        >
          ×
        </button>
      </div>

      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
        All responders in your team have access to this team chat.
      </p>

      {teamMembers.length === 0 ? (
        <div style={{ 
          padding: "2rem", 
          textAlign: "center",
          background: "#fef2f2",
          borderRadius: "0.5rem",
          border: "1px solid #fecaca"
        }}>
          <p style={{ color: "#991b1b", marginBottom: "0.5rem", fontWeight: 500 }}>No team assigned</p>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Please contact your commander to be assigned to a team.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {teamMembers.map((member) => (
            <div 
              key={member.user_id} 
              style={{ 
                border: "1px solid #e5e7eb", 
                borderRadius: "0.5rem", 
                padding: "0.75rem", 
                background: "#f9fafb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{member.full_name}</p>
                <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{member.email}</p>
              </div>
              <span 
                style={{ 
                  fontSize: "0.875rem", 
                  padding: "0.25rem 0.5rem", 
                  background: "#dbeafe", 
                  color: "#1e40af",
                  borderRadius: "0.375rem"
                }}
              >
                {member.responder_type}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
        <button 
          onClick={onClose} 
          style={{ 
            padding: "0.5rem 1rem", 
            background: "#3b82f6", 
            color: "white", 
            borderRadius: "0.375rem",
            border: "none",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default TeamChatGroupManager;
