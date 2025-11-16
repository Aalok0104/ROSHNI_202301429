import React from "react";
import { sendMessage } from "../../services/websocket";

interface GroupSelectorProps {
  responders: string[];
  onCreateGroup: (groupId: string, members: string[]) => void;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ responders, onCreateGroup }) => {
  const [selected, setSelected] = React.useState<string[]>([]);

  const handleToggle = (responder: string) => {
    setSelected((prev) =>
      prev.includes(responder) ? prev.filter((r) => r !== responder) : [...prev, responder]
    );
  };

  const handleCreate = () => {
    const groupId = "grp-" + Date.now();
    onCreateGroup(groupId, selected);
    sendMessage({
    type: "joinGroup",
    groupId,
    members: ["Commander1", ...selected], 
  });
  };

  return (
    <div className="border p-3 rounded">
      <h3 className="font-bold mb-2">Select Responders</h3>
      {responders.map((r) => (
        <label key={r} className="block">
          <input
            type="checkbox"
            checked={selected.includes(r)}
            onChange={() => handleToggle(r)}
          />{" "}
          {r}
        </label>
      ))}
      <button onClick={handleCreate} className="bg-green-500 text-white px-3 py-1 mt-2 rounded">
        Create Group
      </button>
    </div>
  );
};

export default GroupSelector;
