import type { FC } from "react";
import { useState } from "react";
import { sendTeamMessage } from "../../services/websocket";

interface GroupSelectorProps {
  responders: string[];
  onCreateGroup: (groupId: string, members: string[]) => void;
}

const GroupSelector: FC<GroupSelectorProps> = ({ responders, onCreateGroup }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const handleToggle = (responder: string) => {
    setSelected((prev) =>
      prev.includes(responder) ? prev.filter((r) => r !== responder) : [...prev, responder]
    );
  };

  const handleCreate = () => {
    const groupId = "grp-" + Date.now();
    onCreateGroup(groupId, selected);
    // websocket helpers expect a plain string payload
    sendTeamMessage(
      JSON.stringify({
        type: "joinGroup",
        groupId,
        members: ["Commander1", ...selected],
      })
    );
    setSelected([]);
  };

  return (
    <div className="commander-selector">
      <h3>Select Responders</h3>
      {responders.map((r) => (
        <label key={r}>
          <input
            type="checkbox"
            checked={selected.includes(r)}
            onChange={() => handleToggle(r)}
          />
          <span>{r}</span>
        </label>
      ))}
      <button onClick={handleCreate}>Create Group</button>
    </div>
  );
};

export default GroupSelector;
