// src/components/ChatContainer.tsx
import React, { useEffect, useState } from "react";
import ChatBox from "./ChatBox";
import GlobalChatGroupManager from "./GlobalChatGroupManager";
import TeamChatGroupManager from "./TeamChatGroupManager";
import { useChat } from "../../context/ChatContext";
import { API_ENDPOINTS } from "../../config";

interface ChatContainerProps { initialTeamId?: string | null }

const ChatContainer: React.FC<ChatContainerProps> = ({ initialTeamId = null }) => {
  const [teamId, setTeamId] = useState<string | null>(initialTeamId);
  const [activeTab, setActiveTab] = useState<"team" | "global">("team");
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ user_id: string; role: string; responder_type?: string | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const chat = useChat();
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugChat') === '1';

  useEffect(() => {
    (async () => {
      try {
        setLoadingProfile(true);
        const sessionRes = await fetch(API_ENDPOINTS.session, { credentials: "include" });
        if (!sessionRes.ok) throw new Error("Unable to load session");
        const session = await sessionRes.json();
        
        // fetch responder profile for team/responder type (only for responders)
        let responder_type = null;
        let fetchedTeamId = null;
        if (session.role === "responder") {
          const responderRes = await fetch(API_ENDPOINTS.responderProfile, { credentials: "include" });
          if (responderRes.ok) {
            const responderProfile = await responderRes.json();
            responder_type = responderProfile.responder_type ?? null;
            fetchedTeamId = responderProfile.team_id ?? null;
          }
        }
        
        setUserInfo({ user_id: session.user_id, role: session.role, responder_type });
        if (!teamId && fetchedTeamId) setTeamId(fetchedTeamId);
        
        // Set user_id in chat context
        chat.setUserId(session.user_id);
        
        // Try to get disaster_id from URL, default to placeholder for now
        const params = new URLSearchParams(window.location.search);
        const urlDisasterId = params.get('disasterId') || params.get('disaster_id');
        chat.setDisasterId(urlDisasterId || 'default-disaster-001');
        
        // Set initial tab based on role
        if (session.role === "commander") {
          setActiveTab("global");
        } else if (responder_type === "logistician") {
          setActiveTab("global"); // Logistician starts with global, can switch to team
        } else {
          setActiveTab("team"); // Normal responders only see team
        }
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
      if (did && uid && teamId) {
        chat.connectToTeam(did, teamId, uid);
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

  // Role-based access control
  const isCommander = userInfo?.role === "commander";
  const isLogistician = userInfo?.responder_type === "logistician";
  
  const canSeeGlobal = isCommander || isLogistician;
  const canSeeTeam = !isCommander; // Commander doesn't see team chat

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0.5rem" }}>
      {debugMode && (
        <div style={{
          fontSize: '0.7rem',
          lineHeight: 1.2,
          padding: '0.5rem',
          background: '#111827',
          color: '#9CA3AF',
          border: '1px solid #374151',
          borderRadius: 6,
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <strong style={{color:'#FBBF24'}}>Chat Debug</strong><br/>
          loadingProfile: {String(loadingProfile)}<br/>
          profileError: {profileError || 'none'}<br/>
          userInfo.role: {userInfo?.role || 'n/a'}<br/>
          userInfo.responder_type: {userInfo?.responder_type || 'n/a'}<br/>
          teamId state: {teamId || 'none'}<br/>
          activeTab: {activeTab}<br/>
          chat.disasterId: {chat.disasterId || 'none'}<br/>
          chat.userId: {chat.userId || 'none'}<br/>
          globalMessages: {chat.globalMessages.length}<br/>
          teamMessages(currentTeam): {teamId ? (chat.teamMessages[teamId]?.length || 0) : 'n/a'}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {/* Team Chat Tab - Only visible to logisticians and responders */}
        {canSeeTeam && (
          <button
            onClick={() => setActiveTab("team")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              ...(activeTab === "team" 
                ? { background: "#3b82f6", color: "white" }
                : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" })
            }}
          >
            Team Chat
          </button>
        )}
        
        {/* Global Chat Tab - Only visible to commanders and logisticians */}
        {canSeeGlobal && (
          <button
            onClick={() => setActiveTab("global")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              ...(activeTab === "global" 
                ? { background: "#3b82f6", color: "white" }
                : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" })
            }}
          >
            Global Chat
          </button>
        )}

        {/* View Members Button */}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => {
              // Open the in-app modal instead of redirecting
              setIsManagerOpen(true);
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              background: "#10b981",
              color: "white",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#059669"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#10b981"}
          >
            {isCommander ? "View Teams" : isLogistician ? "View Team Members" : "View Team"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {loadingProfile && (
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8 }}>
            Loading chat...
          </div>
        )}
        
        {!loadingProfile && profileError && (
          <div style={{ padding: '1rem', background: '#FEF2F2', borderRadius: 8, color: '#991B1B' }}>
            {profileError}
          </div>
        )}
        
        {!loadingProfile && !profileError && (
          <>
            {activeTab === "team" && canSeeTeam ? (
              <>
                {!teamId ? (
                  <div style={{ 
                    padding: '1rem', 
                    background: 'rgba(254, 226, 226, 0.1)', 
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.875rem'
                  }}>
                    No team assigned. Please contact your administrator.
                  </div>
                ) : (
                  <ChatBox type="team" teamId={teamId} currentUserId={userInfo?.user_id ?? "me"} />
                )}
              </>
            ) : activeTab === "global" && canSeeGlobal ? (
              <ChatBox type="global" currentUserId={userInfo?.user_id ?? "me"} />
            ) : (
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(254, 226, 226, 0.1)', 
                borderRadius: 8,
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.875rem'
              }}>
                You don't have access to this chat.
              </div>
            )}
          </>
        )}
      </div>

      {/* Manager Modal */}
      {isManagerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50"
          style={{ zIndex: 1000 }}
        >
          <div className="bg-white rounded shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            {isCommander ? (
              <GlobalChatGroupManager
                disasterId={chat.disasterId ?? ""}
                onClose={() => setIsManagerOpen(false)}
              />
            ) : teamId ? (
              <TeamChatGroupManager
                teamId={teamId}
                onClose={() => setIsManagerOpen(false)}
              />
            ) : (
              <div style={{ padding: "1.5rem", color: "#1f2937" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Team Members</h3>
                  <button 
                    onClick={() => setIsManagerOpen(false)}
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
                <div style={{ 
                  padding: "2rem", 
                  textAlign: "center",
                  background: "#fef2f2",
                  borderRadius: "0.5rem",
                  border: "1px solid #fecaca"
                }}>
                  <p style={{ color: "#991b1b", marginBottom: "0.5rem", fontWeight: 500 }}>No team assigned yet</p>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Please contact your commander to be assigned to a team.</p>
                </div>
                <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    onClick={() => setIsManagerOpen(false)}
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
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
