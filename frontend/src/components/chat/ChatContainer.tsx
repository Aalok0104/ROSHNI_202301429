// src/components/ChatContainer.tsx
import React, { useEffect, useState } from "react";
import ChatBox from "./ChatBox";
import GroupSelector from "./GroupSelector";
import { useChat } from "../../context/ChatContext";
import { API_ENDPOINTS } from "../../config";

interface ChatContainerProps { initialTeamId?: string | null }

const ChatContainer: React.FC<ChatContainerProps> = ({ initialTeamId = null }) => {
  const [teamId, setTeamId] = useState<string | null>(initialTeamId);
  const [activeTab, setActiveTab] = useState<"team" | "global">("team");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ user_id: string; role: string; responder_type?: string | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const chat = useChat();

  useEffect(() => {
    (async () => {
      try {
        setLoadingProfile(true);
        const sessionRes = await fetch(API_ENDPOINTS.session, { credentials: "include" });
        if (!sessionRes.ok) throw new Error("Unable to load session");
        const session = await sessionRes.json();
        // fetch profile for team/responder type
        const profileRes = await fetch(API_ENDPOINTS.updateProfile, { credentials: "include" });
        let responder_type = null;
        let fetchedTeamId = null;
        if (profileRes.ok) {
          const profile = await profileRes.json();
          responder_type = profile.responder_type ?? null;
          fetchedTeamId = profile.team_id ?? null;
        }
        setUserInfo({ user_id: session.user_id, role: session.role, responder_type });
        if (!teamId && fetchedTeamId) setTeamId(fetchedTeamId);
        
        // Set user_id in chat context
        chat.setUserId(session.user_id);
        
        // Try to get disaster_id from URL, default to placeholder for now
        const params = new URLSearchParams(window.location.search);
        const urlDisasterId = params.get('disasterId') || params.get('disaster_id');
        chat.setDisasterId(urlDisasterId || 'default-disaster-001');
      } catch (e) {
        console.warn("Failed to load user/profile", e);
        setProfileError("Unable to load profile");
      } finally {
        setLoadingProfile(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const did = chat.disasterId;
    const uid = chat.userId;

    if (activeTab === "team") {
      if (did && uid) {
        chat.connectToTeam(did, teamId ?? '', uid);
      }
      chat.disconnectGlobal();
      if (teamId) chat.fetchTeamHistory(teamId);
    } else {
      if (did && uid) {
        chat.connectToGlobal(did, uid);
      }
      chat.disconnectTeam();
      chat.fetchGlobalHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, activeTab]);

  const canSeeGlobal = !!userInfo && (userInfo.role === "commander" || userInfo.responder_type === "logistician");

  const handleCreateGroup = (newTeamId: string) => {
    setTeamId(newTeamId);
    setIsSelectorOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={() => setActiveTab("team")} className={`px-3 py-1 rounded ${activeTab === "team" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Team Chat</button>
        <button
          onClick={() => setActiveTab("global")}
          className={`px-3 py-1 rounded ${activeTab === "global" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          disabled={!canSeeGlobal}
          title={!canSeeGlobal ? "Global chat limited to commander & logisticians" : "Switch to Global Chat"}
        >
          Global Chat
        </button>

        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setIsSelectorOpen(true)} className="px-3 py-1 rounded bg-green-500 text-white">Create/Select Group</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === "team" ? (
          <>
            {loadingProfile && <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>Loading team info…</div>}
            {!loadingProfile && profileError && <div style={{ padding: '1rem', background: '#FEF2F2', borderRadius: 8, color: '#991B1B' }}>{profileError}</div>}
            {!loadingProfile && !profileError && !teamId && <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>No team assigned.</div>}
            {!loadingProfile && !profileError && teamId && <ChatBox type="team" teamId={teamId} currentUserId={userInfo?.user_id ?? "me"} />}
          </>
        ) : (
          <ChatBox type="global" currentUserId={userInfo?.user_id ?? "me"} />
        )}
      </div>

      {isSelectorOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white p-4 rounded shadow-md w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Response Group (local)</h3>
              <button onClick={() => setIsSelectorOpen(false)}>×</button>
            </div>
            <GroupSelector onCreateGroup={(id) => handleCreateGroup(id)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
