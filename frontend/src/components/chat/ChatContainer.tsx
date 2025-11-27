
import type { FC } from "react";
import { useEffect, useState } from "react";

import ChatBox from "./ChatBox";
import GroupSelector from "./GroupSelector";
import { useTheme } from "../../contexts/ThemeContext";

interface ChatContainerProps {
  userId: string;
  responders: string[];
  groupSelectorSignal?: number;
}

interface Group {
  id: string;
  name: string;
  members: string[];
}

const seedGroups: Group[] = [
  { id: "grp-bridge", name: "North Bridge Sector", members: ["Responder-07", "Team Lead"] },
  { id: "grp-supply", name: "Supply Convoy", members: ["Responder-03", "Logistics"] },
];

const ChatContainer: FC<ChatContainerProps> = ({
  userId,
  responders,
  groupSelectorSignal = 0,
}) => {
  const { theme } = useTheme();
  const [groups, setGroups] = useState<Group[]>(seedGroups);
  const [selectedGroup, setSelectedGroup] = useState<string>(seedGroups[0]?.id ?? "");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    if (groupSelectorSignal > 0) {
      setIsSelectorOpen(true);
    }
  }, [groupSelectorSignal]);

  const handleCreateGroup = (groupId: string, members: string[]) => {
    if (!groupId) return;
    const label = `Response Group ${groups.length + 1}`;
    const nextGroup: Group = {
      id: groupId,
      name: label,
      members,
    };
    setGroups((prev) => [...prev, nextGroup]);
    setSelectedGroup(groupId);
    setIsSelectorOpen(false);
  };

  const isLight = theme === 'light';
  const selectBg = isLight ? '#ffffff' : '#0b1323';
  const selectColor = isLight ? '#1e293b' : '#e2e8f0';
  const selectBorder = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';

  return (
    <div className="commander-chat" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: '0.5rem' }}>
      <div style={{ padding: '0.5rem 0' }}>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            backgroundColor: selectBg,
            color: selectColor,
            border: `1px solid ${selectBorder}`,
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
          }}
        >
          <option value="">Select a group...</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({group.members.length} members)
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {selectedGroup ? (
          <ChatBox groupId={selectedGroup} sender={userId} />
        ) : (
          <div style={{ flex: 1 }} />
        )}
      </div>

      {isSelectorOpen && (
        <div className="commander-chat__modal" role="dialog" aria-modal="true">
          <div className="commander-chat__modal-content">
            <div className="commander-chat__modal-header">
              <h3>Create Response Group</h3>
              <button type="button" onClick={() => setIsSelectorOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <GroupSelector responders={responders} onCreateGroup={handleCreateGroup} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
