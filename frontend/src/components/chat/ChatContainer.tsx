import React, { useState } from "react";
import ChatBox from "./chatBox";
import GroupSelector from "./GroupSelector";

interface ChatContainerProps {
  userId: string;
  responders: string[];
}

interface Group {
  id: string;
  members: string[];
}

const ChatContainer: React.FC<ChatContainerProps> = ({ userId, responders }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const handleCreateGroup = (groupId: string, members: string[]) => {
    setGroups([...groups, { id: groupId, members }]);
    setSelectedGroup(groupId);
  };

  return (
    <div className="flex gap-4">
      <div>
        <GroupSelector responders={responders} onCreateGroup={handleCreateGroup} />
        <div className="mt-4">
          <h3 className="font-bold">Groups</h3>
          <ul>
            {groups.map((g) => (
              <li
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`cursor-pointer ${
                  g.id === selectedGroup ? "font-bold text-blue-600" : ""
                }`}
              >
                {g.id}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex-1">
        {selectedGroup ? (
          <ChatBox groupId={selectedGroup} sender={userId} />
        ) : (
          <p>Select a group to start chatting</p>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
