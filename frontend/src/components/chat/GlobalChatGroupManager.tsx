// src/components/chat/GlobalChatGroupManager.tsx
// Commander can see list of teams and their logisticians to add to global chat
import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config";

interface Team {
  team_id: string;
  team_name: string;
  description?: string;
  commander_id?: string;
}

interface Responder {
  user_id: string;
  full_name: string;
  email: string;
  responder_type: string;
  team_id: string;
}

interface Props {
  disasterId: string;
  onClose: () => void;
}

const GlobalChatGroupManager: React.FC<Props> = ({ disasterId, onClose }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamsAndResponders();
  }, [disasterId]);

  const fetchTeamsAndResponders = async () => {
    try {
      setLoading(true);
      
      // Fetch all teams
      const teamsRes = await fetch(`${API_ENDPOINTS.responders}/teams`, {
        credentials: "include",
      });
      
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }

      // Fetch all responders
      const respondersRes = await fetch(API_ENDPOINTS.responders, {
        credentials: "include",
      });
      
      if (respondersRes.ok) {
        const respondersData = await respondersRes.json();
        setResponders(respondersData);
      }
      
      setError(null);
    } catch (e) {
      setError("Failed to load teams and responders");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getLogisticiansForTeam = (teamId: string) => {
    return responders.filter(
      (r) => r.team_id === teamId && r.responder_type === "logistician"
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading teams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>{error}</p>
        <button onClick={onClose} className="mt-2 px-3 py-1 bg-gray-300 rounded">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Global Chat - Responder Teams</h3>
        <button onClick={onClose} className="text-2xl leading-none">&times;</button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Global chat includes you (Commander) and all Logisticians from assigned teams.
      </p>

      {teams.length === 0 ? (
        <p className="text-gray-500">No teams available for this disaster.</p>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const logisticians = getLogisticiansForTeam(team.team_id);
            return (
              <div key={team.team_id} className="border rounded p-3 bg-gray-50">
                <h4 className="font-semibold text-md mb-2">{team.team_name}</h4>
                {team.description && (
                  <p className="text-sm text-gray-600 mb-2">{team.description}</p>
                )}
                
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Logisticians in Global Chat:</p>
                  {logisticians.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No logisticians assigned</p>
                  ) : (
                    <ul className="list-disc list-inside text-sm">
                      {logisticians.map((log) => (
                        <li key={log.user_id}>
                          {log.full_name} ({log.email})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">
          Done
        </button>
      </div>
    </div>
  );
};

export default GlobalChatGroupManager;
